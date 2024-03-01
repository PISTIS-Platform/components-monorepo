import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { FactoriesRegistrantController } from './factories-registrant.controller';
import { FactoriesRegistrant } from './factories-registrant.entity';
import { FactoriesRegistrantService } from './factories-registrant.service';

@Module({
    imports: [MikroOrmModule.forFeature([FactoriesRegistrant]), HttpModule],
    controllers: [FactoriesRegistrantController],
    providers: [FactoriesRegistrantService],
    exports: [],
})
export class FactoriesRegistrantModule {}
