import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ClientInfo, FactoriesRegistrant, RegisteredService } from './entities';
import { FactoriesRegistrantController } from './factories-registrant.controller';
import { FactoriesRegistrantService } from './factories-registrant.service';
import { ServicesMappingService } from './services-mapping.service';

@Module({
    imports: [MikroOrmModule.forFeature([FactoriesRegistrant, ClientInfo, RegisteredService]), HttpModule],
    controllers: [FactoriesRegistrantController],
    providers: [FactoriesRegistrantService, ServicesMappingService],
    exports: [],
})
export class FactoriesRegistrantModule {}
