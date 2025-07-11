import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ComponentHealthController } from './component-health.controller';
import { InvestmentPlannerController } from './investment-planner.controller';
import { InvestmentPlanner } from './entities/investment-planner.entity';
import { ConfigurableModuleClass } from './investment-planner.module-definition';
import { InvestmentPlannerService } from './investment-planner.service';

@Module({
    imports: [MikroOrmModule.forFeature([InvestmentPlanner]), HttpModule, TerminusModule],
    controllers: [InvestmentPlannerController, ComponentHealthController],
    providers: [InvestmentPlannerService],
    exports: [],
})
export class InvestmentPlannerModule extends ConfigurableModuleClass {}
