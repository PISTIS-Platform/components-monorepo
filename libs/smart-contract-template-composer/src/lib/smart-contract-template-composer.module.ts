import { Module } from '@nestjs/common';

import { SmartContractTemplateComposerController } from './smart-contract-template-composer.controller';
import { SmartContractTemplateComposerService } from './smart-contract-template-composer.service';

@Module({
    controllers: [SmartContractTemplateComposerController],
    providers: [SmartContractTemplateComposerService],
    exports: [],
})
export class SmartContractTemplateComposerModule {}
