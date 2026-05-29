import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import axios from 'axios';
import FormData from 'form-data';
import { catchError, firstValueFrom, lastValueFrom, map, of } from 'rxjs';

@Injectable()
export class DataStorageService {
    private readonly logger = new Logger(DataStorageService.name);
    constructor(private readonly httpService: HttpService) {}

    private prepareUrl(factory: string) {
        return `https://${factory}.pistis-market.eu/srv/factory-data-storage/api`;
    }

    async updateTableInStorage(assetId: string, results: any, token: string, factory: string) {
        return firstValueFrom(
            this.httpService
                .post(`${this.prepareUrl(factory)}/tables/add_rows`, results, {
                    headers: getHeaders(token),
                    params: {
                        asset_uuid: assetId,
                    },
                })
                .pipe(
                    map(async (res) => {
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error(`Data update in storage error: ${error}`);
                        throw new Error(`Update table in storage error: ${error}`);
                    }),
                ),
        );
    }

    async createTableInStorage(results: any, token: string, factory: string) {
        return firstValueFrom(
            this.httpService
                .post(
                    `${this.prepareUrl(factory)}/tables/create_table`,
                    {
                        data: results.data,
                        metadata: { id: results.metadata.id },
                        data_model: results.data_model,
                    },
                    {
                        headers: getHeaders(token),
                    },
                )
                .pipe(
                    map(async (res) => {
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error(`Data creation in storage error: ${error}`);
                        throw new Error(`Data creation in storage error: ${error}`);
                    }),
                ),
        );
    }

    async retrievePaginatedData(
        assetUUID: string,
        token: string,
        offset: number,
        limit: number,
        columnsForPagination: Record<string, null>,
        factory: string,
    ) {
        return firstValueFrom(
            this.httpService
                .post(
                    `${this.prepareUrl(
                        factory,
                    )}/tables/get_fields?asset_uuid=${assetUUID}&OFFSET=${offset}&LIMIT=${limit}`,
                    {
                        column_names: columnsForPagination,
                    },
                    { headers: getHeaders(token) },
                )
                .pipe(
                    map(async (res) => {
                        return {
                            data: {
                                rows: res.data.Data,
                            },
                        };
                    }),
                    catchError((error) => {
                        this.logger.error('Data retrieval error:', error);
                        return of({ error: 'Error occurred during data retrieval' });
                    }),
                ),
        );
    }

    async retrieveSqlDataByDateRange(
        token: string,
        factory: string,
        params: {
            asset_uuid: string;
            column_name: string;
            column_datatype: string;
            start_date: string;
            end_date: string;
        },
    ) {
        return firstValueFrom(
            this.httpService
                .get(`${this.prepareUrl(factory)}/tables/get_rows`, {
                    params,
                    headers: getHeaders(token),
                })
                .pipe(
                    map(async (res) => {
                        return {
                            data: res.data[0].data,
                        };
                    }),
                    catchError((err) => {
                        this.logger.error(`Data rows retrieval error: ${err}`);
                        throw new Error(`Data rows retrieval error: ${err}`);
                    }),
                ),
        );
    }

    async countRows(id: string, token: string, factory: string) {
        return firstValueFrom(
            this.httpService
                .get(`${this.prepareUrl(factory)}/tables/count_rows`, {
                    headers: getHeaders(token),
                    params: [
                        {
                            assetUUID: id,
                        },
                    ],
                })
                .pipe(
                    map(async (res) => {
                        return res.data['Number of rows'];
                    }),
                    catchError((err) => {
                        this.logger.error(`Count rows error: ${err}`);
                        throw new Error(`Count rows error: ${err}`);
                    }),
                ),
        );
    }

    async getColumns(uuid: string, token: string, factory: string) {
        try {
            return await fetch(`${this.prepareUrl(factory)}/tables/get_table?asset_uuid=${uuid}&JSON_output=true`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then((res) => res.json())
                .then((response) => response);
        } catch (err) {
            this.logger.error('Get columns error:', err);
            throw new Error(`Get columns error: ${err}`);
        }
    }

    async retrieveFile(assetId: string, token: string, providerPrefix: string): Promise<Blob> {
        return lastValueFrom(
            this.httpService
                .get(`${this.prepareUrl(providerPrefix)}/files/get_file?asset_uuid=${assetId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    responseType: 'arraybuffer',
                })
                .pipe(
                    map(async (res) => {
                        return res.data;
                    }),
                    catchError((error) => {
                        this.logger.error(`Error retrieving file: ${error}`);
                        throw new Error(`Error retrieving file: ${error}`);
                    }),
                ),
        );
    }

    async createFile(data: any, filename: string, token: string, consumerPrefix: string): Promise<any> {
        try {
            const formData = new FormData();
            const buffer = Buffer.from(data.data);
            formData.append('file', buffer, { filename, contentType: 'application/octet-stream' });
            // POST the data to create a new file

            const uploadResponse = await axios.post(`${this.prepareUrl(consumerPrefix)}/files/create_file`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`,
                },
            });

            if (uploadResponse.status !== 200) {
                throw new Error(`Error uploading the file: ${uploadResponse.statusText}`);
            }

            return uploadResponse.data;
        } catch (error) {
            console.error(`Error creating file: ${error}`);
            throw new Error(`Error creating file: ${error}`);
        }
    }
}
