import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { MODULE_OPTIONS_TOKEN } from './metadata-repository-definition';
import { MetadataRepositoryModuleOptions } from './metadata-repository-options.interface';

@Injectable()
export class MetadataRepositoryService {
    private readonly logger = new Logger(MetadataRepositoryService.name);
    constructor(
        private readonly httpService: HttpService,
        @Inject(MODULE_OPTIONS_TOKEN) private options: MetadataRepositoryModuleOptions,
    ) { }

    async retrieveMetadata(assetId: string) {
        return await firstValueFrom(
            this.httpService
                .get(`https://pistis-market.eu/srv/search/datasets/${assetId}`)
                .pipe(
                    map((res) => {
                        return res.data.result
                    }),
                    catchError((error) => {
                        this.logger.error('Metadata retrieval error:', error);
                        return of({ error: 'Error occurred during metadata retrieval' });
                    }),
                ),
        );
    }

    async retrieveCatalog(catalogId: string, factoryPrefix: string, token: string) {
        return await fetch(`https://${factoryPrefix}.pistis-market.eu/srv/repo/catalogues/${catalogId}`, {
            headers: {
                'Content-Type': 'text/turtle',
                Authorization: `Bearer ${token}`
            }
        }).then((res) => {
            if (!res.ok) {
                throw new Error(`Error fetching the catalog: ${res.statusText}`);
            }
            return res.json()
        })
            .then((response) => response)
    }

    async createMetadata(metadata: any, catalogId: string, factoryPrefix: string, token: string) {
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
                dct:description     "${metadata.description.en}"@en ;
                dct:title           "${metadata.title.en}"@en ;
                dcat:keyword        "${metadata.keyword != null ? metadata.keyword.map((keyword: string) => `"${keyword}"@en`).join(', ') : ''}  " ;
                dct:publisher       [ a     foaf:${metadata.publisher.type} ;
                                            foaf:mbox <${metadata.publisher.email}> ;
                                            foaf:name "${metadata.publisher.name}" ; ] ;
                dcat:theme          <http://publications.europa.eu/resource/authority/data-theme/EDUC> ;
                dct:language        <http://publications.europa.eu/resource/authority/language/ENG> ;
                dct:issued          "${metadata.issued}"^^xsd:dateTime ;
                dct:modified        "${metadata.modified}"^^xsd:dateTime ;
                dcat:distribution   <https://piveau.io/set/distribution/1> .

            <https://piveau.io/set/distribution/1>
                a              dcat:Distribution ;
                dct:title      "${metadata.distributions[1].title.en}" ;
                dct:license    [
                                    dct:identifier "${metadata.distributions[1].license.id}" ;
                                    dct:title "${metadata.distributions[1].license.label}" ;
                                    skos:prefLabel "${metadata.distributions[1].license.description}" ;
                                    skos:exactMatch <${metadata.distributions[1].license.resource}>
                            ] ;
                dct:format     <${metadata.distributions[0].format.resource}> ;
                dcat:byteSize  "${metadata.distributions[1].byte_size}"^^xsd:decimal ;
                dcat:accessURL <${metadata.distributions[1].access_url[0]}> .
        `
        return await firstValueFrom(
            this.httpService.post(`https://${factoryPrefix}.pistis-market.eu/srv/repo/catalogues/${catalogId}/datasets`, rdfData, {
                headers: {
                    "Content-Type": "text/turtle",
                    Authorization: `Bearer ${token}`
                }
            }).pipe(
                map((res) => {
                    return res
                }),
                catchError((error) => {
                    this.logger.error('Metadata retrieval error:', error);
                    return of({ error: 'Error occurred during metadata retrieval' });
                }),
            ),
        );
    }

    async createCatalog(catalogId: string, factory: any, token: string) {
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
    `
        return await firstValueFrom(
            this.httpService.put(`https://${factory.factoryPrefix}.pistis-market.eu/srv/repo/catalogues/${catalogId}`, rdfData, {
                headers: {
                    "Content-Type": "text/turtle",
                    Authorization: `Bearer ${token}`
                }
            }).pipe(
                map((res) => {
                    return res
                }),
                catchError((error) => {
                    this.logger.error('Catalog creation error:', error);
                    return of({ error: 'Error occurred during catalog creation' });
                }),
            ),
        );
    }
}
