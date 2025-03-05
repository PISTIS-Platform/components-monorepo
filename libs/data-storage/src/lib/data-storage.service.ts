import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, lastValueFrom, map, of } from 'rxjs';


@Injectable()
export class DataStorageService {
    private readonly logger = new Logger(DataStorageService.name);
    constructor(
        private readonly httpService: HttpService,
        // @Inject(MODULE_OPTIONS_TOKEN) private options: DataStorageModuleOptions,
    ) { }

    private prepareUrl(factory: string) {
        return `https://${factory}.pistis-market.eu/srv/factory-data-storage/api`
    }

    async updateTableInStorage(assetId: string, results: any, token: string, factory: string) {
        try {
            return await firstValueFrom(
                this.httpService
                    .post(`${this.prepareUrl(factory)}/tables/add_rows`, JSON.stringify(results), {
                        headers: getHeaders(token),
                        params: {
                            asset_uuid: assetId,
                        },
                    })
                    .pipe(
                        map(async (res) => {
                            return res.data;
                        }),
                        // Catch any error occurred during update
                        catchError((error) => {
                            this.logger.error('Data update in storage error:', error);
                            return of({ error: 'Error occurred during data update in storage' });
                        }),
                    ),
            );
        } catch (err) {
            this.logger.error('Update table in storage error:', err);
        }

    }

    async createTableInStorage(results: any, token: string, factory: string) {
        try {
            return await firstValueFrom(
                this.httpService
                    .post(`${this.prepareUrl(factory)}/tables/create_table`, results, {
                        headers: getHeaders(token),
                    })
                    .pipe(
                        map(async (res) => {
                            return res.data;
                        }),
                        // Catch any error occurred during creation
                        catchError((error) => {
                            this.logger.error('Data creation in storage error:', error);
                            return of({ error: 'Error occurred during data creation in storage' });
                        }),
                    ),
            );
        } catch (err) {
            this.logger.error('Create table in storage error:', err);
        }

    }

    async retrievePaginatedData(
        assetUUID: string,
        token: string,
        offset: number,
        limit: number,
        columnsForPagination: Record<string, null>,
        factory: string
    ) {
        return await firstValueFrom(
            this.httpService
                .post(
                    `${this.prepareUrl(factory)}/tables/get_fields?asset_uuid=${assetUUID}&OFFSET=${offset}&LIMIT=${limit}`,
                    {
                        column_names: columnsForPagination,
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
    }

    async countRows(id: string, token: string, factory: string) {
        const body = [
            {
                assetUUID: id,
            },
        ];

        try {
            return await firstValueFrom(
                this.httpService
                    .get(`${this.prepareUrl(factory)}/tables/count_rows`, {
                        headers: getHeaders(token),
                        params: body,
                    })
                    .pipe(
                        map(async (res) => {
                            return res.data['Number of rows'];
                        }),
                        // Catch any error occurred during rows retrieval
                        catchError((error) => {
                            this.logger.error('Count rows error:', error);
                            return of({ error: 'Error occurred during count rows retrieval' });
                        }),
                    ),
            );
        } catch (err) {
            console.error('Count rows error:', err);
            this.logger.error('Count rows error:', err);
        }

    }

    async getColumns(uuid: string, token: string, factory: string) {
        try {
            return await fetch(`${this.prepareUrl(factory)}/tables/get_table?asset_uuid=${uuid}&JSON_output=true`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            ).then((res) => res.json())
                .then((response) => response)
        } catch (err) {
            console.error('Get columns error:', err);
            this.logger.error('Get columns error:', err);
        }

    }

    // async transferFile(assetId: string, token: string, consumerPrefix: string, providerPrefix: string) {
    //     try {
    //         //Fetch the file as a Blob
    //         const fileResponse = await fetch(
    //             `${this.prepareUrl(providerPrefix)}/files/get_file?asset_uuid=${assetId}`,
    //             {
    //                 headers: {
    //                     Authorization: `Bearer ${token}`,
    //                 },
    //             }
    //         );

    //         if (!fileResponse.ok) {
    //             throw new Error(`Error fetching the file: ${fileResponse.statusText}`);
    //         }

    //         //Convert response to Blob
    //         const blob = await fileResponse.blob();

    //         //Create FormData and append the file (blob)
    //         const formData = new FormData();
    //         formData.append('file', blob, 'filename');

    //         //POST the file to create a new file
    //         const uploadResponse = await fetch(
    //             `${this.prepareUrl(consumerPrefix)}/files/create_file`,
    //             {
    //                 method: 'POST',
    //                 body: formData,
    //                 headers: {
    //                     Authorization: `Bearer ${token}`,
    //                 },
    //             }
    //         );

    //         if (!uploadResponse.ok) {
    //             throw new Error(`Error uploading the file: ${uploadResponse.statusText}`);
    //         }

    //         // Parse and return the JSON response
    //         const jsonResponse = await uploadResponse.json();

    //         return jsonResponse;
    //     } catch (error) {
    //         console.error(`Error during file transfer:${error}`);
    //         throw new Error(`Error during file transfer:${error}`)
    //     }
    // }

    async retrieveFile(assetId: string, token: string, providerPrefix: string): Promise<Blob> {
        try {
            // Fetch the file as a Blob
            const fileResponse = await lastValueFrom(
                this.httpService.get(`${this.prepareUrl(providerPrefix)}/files/get_file?asset_uuid=${assetId}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    responseType: 'arraybuffer'
                }).pipe(
                    map(async (res) => {
                        return res.data;
                    }),
                    // Catch any error occurred during update
                    catchError((error) => {
                        this.logger.error('Data fetching from storage error:', error);
                        return of({ error: 'Error fetching the file' });
                    }),
                ),
            );

            return fileResponse;
        } catch (error) {
            console.error(`Error retrieving file: ${error}`);
            throw new Error(`Error retrieving file: ${error}`);
        }
    }

    async createFile(data: any, filename: string, token: string, consumerPrefix: string): Promise<any> {
        console.log(`URL: ${this.prepareUrl(consumerPrefix)}/files/create_file`)
        try {

            const formData = new FormData();
            formData.append('file', new Blob([data]), filename);

            // POST the file to create a new file
            const uploadResponse = await fetch(
                `${this.prepareUrl(consumerPrefix)}/files/create_file`,
                {
                    method: 'POST',
                    body: formData,
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!uploadResponse.ok) {
                throw new Error(`Error uploading the file: ${uploadResponse.statusText}`);
            }

            // Parse and return the JSON response
            const jsonResponse = await uploadResponse.json();

            return jsonResponse;
        } catch (error) {
            console.error(`Error creating file: ${error}`);
            throw new Error(`Error creating file: ${error}`);
        }
    }
}
