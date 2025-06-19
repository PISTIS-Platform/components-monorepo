import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ComponentHealthController } from './component-health.controller';
import { SCTCController } from './sctc.controller';
import { SCTCService } from './sctc.service';

@Module({
    imports: [TerminusModule],
    controllers: [SCTCController, ComponentHealthController],
    providers: [SCTCService],
    exports: [],
})
export class SCTCModule {}
