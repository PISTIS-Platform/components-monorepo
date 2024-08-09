import { Module } from '@nestjs/common';

import { SCTCController } from './sctc.controller';
import { SCTCService } from './sctc.service';

@Module({
    controllers: [SCTCController],
    providers: [SCTCService],
    exports: [],
})
export class SCTCModule {}
