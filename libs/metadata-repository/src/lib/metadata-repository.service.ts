import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { MODULE_OPTIONS_TOKEN } from './metadata-repository-definition';
import { MetadataRepositoryModuleOptions } from './metadata-repository-options.interface';

@Injectable()
export class MetadataRepositoryService {
    private readonly logger = new Logger(MetadataRepositoryService.name);

    constructor(
        private readonly httpService: HttpService,
        @Inject(MODULE_OPTIONS_TOKEN) private options: MetadataRepositoryModuleOptions,
    ) {}

    async retrieveMetadata(assetId: string) {
        let metadata;
        try {
            metadata = await firstValueFrom(
                this.httpService.get(`https://pistis-market.eu/srv/search/datasets/${assetId}`).pipe(
                    map((res) => {
                        return res.data.result;
                    }),
                    catchError((error) => {
                        this.logger.error('Metadata retrieval error:', error);
                        return of({ error: 'Error occurred during metadata retrieval' });
                    }),
                ),
            );
        } catch (err) {
            this.logger.error('Metadata retrieval from cloud error:', err);
            throw new Error(`Metadata retrieval from cloud error: ${err}`);
        }
        return metadata;
    }

    async retrieveCatalog(catalogId: string, factoryPrefix: string) {
        let catalog;
        try {
            catalog = await fetch(`https://${factoryPrefix}.pistis-market.eu/srv/repo/catalogues/${catalogId}`, {
                headers: {
                    'Content-Type': 'text/turtle',
                    'X-API-Key': this.options.apiKey,
                },
            })
                .then((res) => {
                    if (!res.ok) {
                        throw new Error(`Error fetching the catalog: ${res.statusText}`);
                    }
                    return res.json();
                })
                .then((response) => response['@graph']);
        } catch (err) {
            this.logger.error('Factory catalog retrieval error:', err);
            throw new Error(`Factory catalog retrieval error: ${err}`);
        }
        return catalog;
    }

    async createMetadata(assetId: string, catalogId: string, factoryPrefix: string, originalAssetId: string) {
        const metadata = await this.retrieveMetadata(originalAssetId);

        const getDistributionsValue = (key: string) => {
            const entry = metadata.distributions.find((item: any) => item[key]);
            if (key === 'byte_size') {
                return entry[key] ? entry[key] : '';
            }
            return Object.values(entry[key])[0];
        };

        const getValue = (obj: any): string | null => {
            if (Object.keys(obj).length > 0) {
                return `"${Object.values(obj)[0]}"@${Object.keys(obj)[0]}`;
            }
            return null;
        };

        const getValueLicense = (key: string, value: string) => {
            const entry = metadata.monetization[0].purchase_offer.find((item: any) => {
                return item[key];
            });
            return entry ? (value !== '' ? entry[key][value] : entry[key]) : '';
        };

        const byteSizeValue = getDistributionsValue('byte_size');
        const byteSizeEntry = byteSizeValue ? `dcat:byteSize  "${byteSizeValue}"^^xsd:decimal ;` : '';

        const rdfData = `
            @prefix dcat:                <http://www.w3.org/ns/dcat#> .
            @prefix dct:                 <http://purl.org/dc/terms/> .
            @prefix xsd:                 <http://www.w3.org/2001/XMLSchema#> .
            @prefix odrl:                <http://www.w3.org/ns/odrl/2/> .
            @prefix vcard:               <http://www.w3.org/2006/vcard/ns#> .
            @prefix foaf:                <http://xmlns.com/foaf/0.1/> .
            @prefix skos:                <http://www.w3.org/2004/02/skos/core#> .

            <https://piveau.io/set/data/test-dataset>
                a                   dcat:Dataset ;
                dct:description     ${getValue(metadata.description)} ;
                dct:title           ${getValue(metadata.title)} ;
                dcat:keyword        ${
                    metadata.keywords != null
                        ? metadata.keywords.map((keyword: any) => `"${keyword.label}"@${keyword.language}`).join(', ')
                        : ''
                } ;
                dct:publisher       [ a     foaf:${metadata.publisher.type} ;
                                            foaf:mbox <${metadata.publisher.email}> ;
                                            foaf:name "${metadata.publisher.name}" ; ] ;
                dcat:theme          <http://publications.europa.eu/resource/authority/data-theme/EDUC> ;
                dct:language        <http://publications.europa.eu/resource/authority/language/ENG> ;
                dct:issued          "${new Date().toISOString()}"^^xsd:dateTime ;
                dct:modified        "${new Date().toISOString()}"^^xsd:dateTime ;
                dcat:distribution   <https://piveau.io/set/distribution/1> .

            <https://piveau.io/set/distribution/1>
                a              dcat:Distribution ;
                dct:title      "${getDistributionsValue('title')}" ;
                dct:license    [
                                    dct:identifier "${getValueLicense('license', 'id')}" ;
                                    dct:title "${getValueLicense('license', 'label')}" ;
                                    skos:prefLabel "${getValueLicense('license', 'description')}" ;
                                    skos:exactMatch <${getValueLicense('license', 'resource')}>
                            ] ;
                dct:format     <${getDistributionsValue('format')}> ;
                ${byteSizeEntry}
                dcat:accessURL <https://${factoryPrefix}.pistis-market.eu/srv/factory-data-storage/api/files/get_file?asset_uuid=${assetId}> .
        `;

        try {
            await firstValueFrom(
                this.httpService
                    .post(
                        `https://${factoryPrefix}.pistis-market.eu/srv/repo/catalogues/${catalogId}/datasets`,
                        rdfData,
                        {
                            headers: {
                                'Content-Type': 'text/turtle',
                                'X-API-Key': this.options.apiKey,
                            },
                        },
                    )
                    .pipe(
                        map((res) => {
                            return res;
                        }),
                        catchError((error) => {
                            this.logger.error('Metadata creation error:', error);
                            return of({ error: 'Error occurred during creation retrieval' });
                        }),
                    ),
            );
        } catch (err) {
            this.logger.error('Metadata creation error:', err);
            throw new Error(`Metadata creation error: ${err}`);
        }
    }

    async createCatalog(catalogId: string, factory: any) {
        const rdfData = `
        @prefix dcat: <http://www.w3.org/ns/dcat#> .
        @prefix dct:  <http://purl.org/dc/terms/> .
        @prefix foaf: <http://xmlns.com/foaf/0.1/> .

        <https://piveau.io/id/catalogue/${factory.factoryPrefix}>
            a                dcat:Catalog;
            dct:creator      <https://piveau.eu/def/creator>;
            dct:description  "The ${factory.organizationName} acquired catalog."@en;
            dct:issued       "${new Date().toISOString()}"^^<http://www.w3.org/2001/XMLSchema#dateTime>;
            dct:modified     "${new Date().toISOString()}"^^<http://www.w3.org/2001/XMLSchema#dateTime>;
            dct:language     <http://publications.europa.eu/resource/authority/language/ENG>;
            dct:spatial      <http://publications.europa.eu/resource/authority/country/${factory.country}>;
            dct:title        "${factory.organizationName}"@en;
            dct:type         "dcat-ap";
            foaf:homepage    <https://${factory.factoryPrefix}.pistis-market.eu/ .

        <https://piveau.eu/def/creator>
            a          foaf:Agent;
            foaf:name  "The ${factory.organizationName}" .
    `;
        return await firstValueFrom(
            this.httpService
                .put(`https://${factory.factoryPrefix}.pistis-market.eu/srv/repo/catalogues/${catalogId}`, rdfData, {
                    headers: {
                        'Content-Type': 'text/turtle',
                        'X-API-Key': this.options.apiKey,
                    },
                })
                .pipe(
                    map((res) => {
                        return res;
                    }),
                    catchError((error) => {
                        this.logger.error('Catalog creation error:', error);
                        return of({ error: 'Error occurred during catalog creation' });
                    }),
                ),
        );
    }

    async createLineage(data: any, token: string, factoryPrefix: string) {
        await firstValueFrom(
            this.httpService
                .post(`https://${factoryPrefix}.pistis-market.eu/srv/lineage-tracker/write_lineage`, data, {
                    headers: getHeaders(token),
                })
                .pipe(
                    map((res) => {
                        return res;
                    }),
                    catchError((error) => {
                        this.logger.error('Metadata creation error:', error);
                        return of({ error: 'Error occurred during creation retrieval' });
                    }),
                ),
        );
    }

    async retrieveLineage(assetId: string, token: string) {
        return await firstValueFrom(
            this.httpService
                .get(`https://pistis-market.eu/srv/lineage-tracker/read_lineage?dataset_id=${assetId}`, {
                    headers: getHeaders(token),
                })
                .pipe(
                    map((res) => {
                        return res;
                    }),
                    catchError((error) => {
                        this.logger.error('Lineage retrieval error:', error);
                        return of({ error: 'Error occurred during lineage retrieval' });
                    }),
                ),
        );
    }
}
