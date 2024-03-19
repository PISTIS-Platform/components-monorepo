import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { MODULE_OPTIONS_TOKEN } from './data-storage.module-definition';
import { DataStorageModuleOptions } from './data-storage-module-options.interface';

@Injectable()
export class DataStorageService {
    private readonly logger = new Logger(DataStorageService.name);

    constructor(
        private readonly httpService: HttpService,
        @Inject(MODULE_OPTIONS_TOKEN) private options: DataStorageModuleOptions,
    ) {}

    async updateTableInStorage(assetId: string, results: any, token: any) {
        //FIXME: change types in variables when we have actual results
        return await firstValueFrom(
            this.httpService
                .post(`${this.options.url}/assets/add_rows`, JSON.stringify(results), {
                    headers: getHeaders(token),
                    params: {
                        asset_uuid: assetId,
                    },
                })
                .pipe(
                    map(async (res) => {
                        return res.data;
                        //FIXME: return object from data storage update
                    }),
                    // Catch any error occurred during update
                    catchError((error) => {
                        this.logger.error('Data update in storage error:', error);
                        return of({ error: 'Error occurred during data update in storage' });
                    }),
                ),
        );
    }

    async createTableInStorage(results: any, token: any) {
        //FIXME: change types in variables when we have actual results
        return await firstValueFrom(
            this.httpService
                .post(`${this.options.url}/assets/create_table`, JSON.stringify(results), {
                    headers: getHeaders(token),
                })
                .pipe(
                    map(async (res) => {
                        return res.data;
                        //FIXME: return object from data storage
                    }),
                    // Catch any error occurred during creation
                    catchError((error) => {
                        this.logger.error('Data creation in storage error:', error);
                        return of({ error: 'Error occurred during data creation in storage' });
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
    ) {
        const body = {
            column_names: columnsForPagination,
        };
        const params = {
            asset_type: 'Dataset',
            assetUUID,
            offset: offset,
            limit: limit,
        };

        const data = await firstValueFrom(
            this.httpService
                .post(
                    `${this.options.url}/assets/get_fields`,
                    {
                        body: body,
                        params: params,
                    },
                    { headers: getHeaders(token) },
                )
                .pipe(
                    map(async (res) => {
                        return {
                            data: {
                                rows: res.data.Data
                            }
                        }
                    }),
                    // Catch any error occurred during data retrieval
                    catchError((error) => {
                        this.logger.error('Data retrieval error:', error);
                        return of({ error: 'Error occurred during data retrieval' });
                    }),
                ),
        );

        return {
            data: {
                rows: data,
            },
        };
    }

    async countRows(id: string, token: string) {
        const body = [
            {
                assetUUID: id,
            },
        ];

        return await firstValueFrom(
            this.httpService
                .get(`${this.options.url}/assets/count_rows`, {
                    headers: getHeaders(token),
                    params: body,
                })
                .pipe(
                    map(async (res) => {
                        return res.data['Number of rows'];
                        //FIXME: return appropriate value when we have something from data store api
                    }),
                    // Catch any error occurred during the contract validation
                    catchError((error) => {
                        this.logger.error('Contract validation error:', error);
                        return of({ error: 'Error occurred during contract validation retrieval' });
                    }),
                ),
        );
    }

    async getColumns(uuid: string): Promise<any> {
        const body = [
            {
                assetType: 'DATASET',
                assetUUIDs: [uuid],
            },
        ];

        return await firstValueFrom(
            this.httpService
                .post(
                    `${this.options.url}/assets/get_tables`,
                    {
                        body: body,
                    },
                    { headers: getHeaders('') },
                )
                .pipe(
                    map(async (res) => {
                        return res.data.data_model;
                        //FIXME: return appropriate value when we have something from data store api
                    }),
                    // Catch any error occurred during the contract validation
                    catchError((error) => {
                        this.logger.error('Data Store columns retrieval error:', error);
                        return of({ error: 'Error occurred during retrieving columns from Data Store' });
                    }),
                ),
        );
    }
}
