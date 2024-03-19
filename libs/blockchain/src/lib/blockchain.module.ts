import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ConfigurableModuleClass } from './blockchain.module-definition';
import { BlockchainService } from './blockchain.service';

@Module({
    imports: [HttpModule],
    controllers: [],
    providers: [BlockchainService],
    exports: [BlockchainService],
})
export class BlockchainModule extends ConfigurableModuleClass {}
