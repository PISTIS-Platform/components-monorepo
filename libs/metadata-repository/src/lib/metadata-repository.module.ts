import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { MetadataRepositoryService } from './metadata-repository.service';
import { ConfigurableModuleClass } from './metadata-repository-definition';

@Module({
    imports: [HttpModule],
    controllers: [],
    providers: [MetadataRepositoryService],
    exports: [MetadataRepositoryService],
})
export class MetadataRepositoryModule extends ConfigurableModuleClass {}
