import { DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthCheckService } from '@nestjs/terminus';

import { ComponentHealthController } from './component-health.controller';

@Module({})
export class ComponentHealthModule {
    static register(indicators: any[]): DynamicModule {
        return {
            module: ComponentHealthModule,
            imports: [TerminusModule],
            controllers: [ComponentHealthController],
            providers: [HealthCheckService, ...indicators],
            exports: [],
        };
    }
}
