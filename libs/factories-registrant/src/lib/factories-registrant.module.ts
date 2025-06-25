import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ComponentHealthController } from './component-health.controller';
import { ClientInfo, FactoriesRegistrant, RegisteredService } from './entities';
import { FactoriesRegistrantController } from './factories-registrant.controller';
import { ConfigurableModuleClass } from './factories-registrant.module-definition';
import { FactoriesRegistrantService } from './factories-registrant.service';
import { ServicesMappingService } from './services-mapping.service';

@Module({
    imports: [
        MikroOrmModule.forFeature([FactoriesRegistrant, ClientInfo, RegisteredService]),
        HttpModule,
        TerminusModule,
    ],
    controllers: [FactoriesRegistrantController, ComponentHealthController],
    providers: [FactoriesRegistrantService, ServicesMappingService],
    exports: [],
})
export class FactoriesRegistrantModule extends ConfigurableModuleClass {}
