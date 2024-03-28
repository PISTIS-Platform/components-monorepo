import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { ClientInfo, FactoriesRegistrant } from './entities';
import { FactoriesRegistrantController } from './factories-registrant.controller';
import { FactoriesRegistrantService } from './factories-registrant.service';

@Module({
    imports: [MikroOrmModule.forFeature([FactoriesRegistrant, ClientInfo]), HttpModule],
    controllers: [FactoriesRegistrantController],
    providers: [FactoriesRegistrantService],
    exports: [],
})
export class FactoriesRegistrantModule {}
