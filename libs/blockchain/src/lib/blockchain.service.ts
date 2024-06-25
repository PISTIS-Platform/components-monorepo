import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { TransactionInfo } from '../interfaces';
import { MODULE_OPTIONS_TOKEN } from './blockchain.module-definition';
import { BlockchainModuleOptions } from './blockchain-module-options.interface';
@Injectable()
export class BlockchainService {
    private readonly logger = new Logger(BlockchainService.name);

    constructor(
        private readonly httpService: HttpService,
        @Inject(MODULE_OPTIONS_TOKEN) private options: BlockchainModuleOptions,
    ) {}

    async isContractValid(id: string, token: string): Promise<any | { error: string }> {
        return firstValueFrom(
            this.httpService
                .post(
                    `${this.options.url}/checkSmartContracts`,
                    //FIXME: change body when we have answer from UBI
                    {
                        dataset: [id],
                    },
                    {
                        headers: getHeaders(token),
                        // to be updated when we start to communicate with blockchain
                    },
                )
                .pipe(
                    //If not an error from call admin receive the message below
                    map(async (res) => {
                        return res.data;
                        //FIXME: return appropriate value when we have something from blockchain
                    }),
                    // Catch any error occurred during the contract validation
                    catchError((error) => {
                        this.logger.error('Contract validation error:', error);
                        return of({ error: 'Error occurred during contract validation retrieval' });
                    }),
                ),
        );
    }

    async updateBlockchain(params: TransactionInfo, token: string) {
        return firstValueFrom(
            this.httpService
                .post(
                    `${this.options.url}/storeFactoryConnectorData`,
                    {
                        assetId: params.assetId,
                        transactionId: params.transactionId,
                        downloadstartedat: params.dateTime,
                    },
                    { headers: getHeaders(token) },
                )
                .pipe(
                    //If not an error from call admin receive the message below
                    map(async (res) => {
                        return res.data;
                        //FIXME: return appropriate value when we have something from blockchain
                    }),
                    // Catch any error occurred during the contract validation
                    catchError((error) => {
                        this.logger.error('Update Blockchain error:', error);
                        return of({ error: 'Error occurred when updating info in Blockchain' });
                    }),
                ),
        );
    }

    async retrieveTransactions(id: string, token: string) {
        return firstValueFrom(
            this.httpService
                .get(`${this.options.url}/getTransactionInfo/assetId/${id}`, { headers: getHeaders(token) })
                .pipe(
                    //If not an error from call admin receive the message below
                    map(async (res) => {
                        return res.data;
                        //FIXME: return appropriate value when we have something from blockchain
                    }),
                    // Catch any error occurred during the contract validation
                    catchError((error) => {
                        this.logger.error('Update Blockchain error:', error);
                        return of({ error: 'Error occurred when updating info in Blockchain' });
                    }),
                ),
        );
    }
}
