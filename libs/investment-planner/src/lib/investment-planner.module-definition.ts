import { ConfigurableModuleBuilder } from '@nestjs/common';

import { InvestmentPlannerModuleOptions } from './investment-planner-module-options.interface';

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN: INVESTMENT_PLANNER_MODULE_OPTIONS,
    OPTIONS_TYPE: INVESTMENT_PLANNER_OPTIONS_TYPE,
    ASYNC_OPTIONS_TYPE: INVESTMENT_PLANNER_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<InvestmentPlannerModuleOptions>().build();
