import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { MODULE_OPTIONS_TOKEN } from './metadata-repository-definition';
import { MetadataRepositoryModuleOptions } from './metadata-repository-options.interface';

@Injectable()
export class MetadataRepositoryService {
    private readonly logger = new Logger(MetadataRepositoryService.name);
    constructor(
        private readonly httpService: HttpService,
        @Inject(MODULE_OPTIONS_TOKEN) private options: MetadataRepositoryModuleOptions,
    ) {}

    async retrieveMetadata(assetId: string): Promise<any> {
        //TODO: api call to data catalogue endpoint

        return {
            assetId,
            name: 'Asset Name',
        };
    }
}
