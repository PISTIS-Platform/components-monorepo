import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ConfigurableModuleClass } from './data-storage.module-definition';
import { DataStorageService } from './data-storage.service';

@Module({
    imports: [HttpModule],
    providers: [DataStorageService],
    exports: [DataStorageService],
})
export class DataStorageModule extends ConfigurableModuleClass {}
