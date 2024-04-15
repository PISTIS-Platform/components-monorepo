import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { getHeaders } from '@pistis/shared';
import { catchError, firstValueFrom, map, of } from 'rxjs';

import { MODULE_OPTIONS_TOKEN } from './blockchain.module-definition';
import { BlockchainModuleOptions } from './blockchain-module-options.interface';
import { TransactionInfo } from '../interfaces';
@Injectable()
export class BlockchainService {
    private readonly logger = new Logger(BlockchainService.name);

    constructor(
        private readonly httpService: HttpService,
        @Inject(MODULE_OPTIONS_TOKEN) private options: BlockchainModuleOptions,
    ) {}

    async isContractValid(id: string, token: string): Promise<any | { error: string }> {
        //FIXME: change types in promise when we have actual results
        return firstValueFrom(
            this.httpService
                .get(`${this.options.url}/${id}`, {
                    headers: getHeaders(token),
                    // to be updated when we start to communicate with blockchain
                })
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

    //FIXME:: update function params and what will be sent to Blockchain when we will have something from blockchain
    async updateBlockchain(params: TransactionInfo, token: string) {
        return firstValueFrom(
            this.httpService
                .post(`${this.options.url}`, {
                    headers: getHeaders(token),
                    params,
                    // to be updated when we start to communicate with blockchain
                })
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
