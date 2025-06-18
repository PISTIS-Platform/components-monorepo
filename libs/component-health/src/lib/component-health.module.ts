import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ComponentHealthController } from './component-health.controller';

@Module({
    imports: [TerminusModule],
    controllers: [ComponentHealthController],
    providers: [],
    exports: [TerminusModule],
})
export class ComponentHealthModule {}
