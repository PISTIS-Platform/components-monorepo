import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MetadataRepositoryModule } from '@pistis/metadata-repository';

import { ComponentHealthController } from './component-health.controller';
import { InvestmentPlanner } from './entities/investment-planner.entity';
import { UserInvestment } from './entities/user-investment.entity';
import { InvestmentPlannerController } from './investment-planner.controller';
import {
    ConfigurableModuleClass,
    INVESTMENT_PLANNER_ASYNC_OPTIONS_TYPE,
    INVESTMENT_PLANNER_OPTIONS_TYPE,
} from './investment-planner.module-definition';
import { InvestmentPlannerService } from './investment-planner.service';

@Module({
    imports: [MikroOrmModule.forFeature([InvestmentPlanner, UserInvestment]), HttpModule, TerminusModule],
    controllers: [InvestmentPlannerController, ComponentHealthController],
    providers: [InvestmentPlannerService],
    exports: [],
})
export class InvestmentPlannerModule extends ConfigurableModuleClass {
    static register(options: typeof INVESTMENT_PLANNER_OPTIONS_TYPE): DynamicModule {
        return {
            imports: [
                MetadataRepositoryModule.register({
                    url: options.metadataRepositoryUrl,
                    apiKey: options.marketplaceKey,
                    cloudURL: options.cloudURL,
                }),
            ],

            ...super.register(options),
        };
    }

    static registerAsync(asyncOptions: typeof INVESTMENT_PLANNER_ASYNC_OPTIONS_TYPE): DynamicModule {
        const parent = super.registerAsync(asyncOptions);

        parent.imports = [
            ...(parent.imports ?? []),
            MetadataRepositoryModule.registerAsync({
                imports: asyncOptions?.imports,
                inject: asyncOptions?.inject,
                useFactory: async (config: typeof asyncOptions.inject) => {
                    const options: any = asyncOptions.useFactory ? await asyncOptions.useFactory(config) : {};

                    return {
                        url: options.metadataRepositoryUrl,
                        apiKey: options.marketplaceKey,
                        cloudURL: options.cloudURL,
                    };
                },
            }),
        ];

        return { ...parent };
    }
}
