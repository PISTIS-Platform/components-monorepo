import { ConfigurableModuleBuilder } from '@nestjs/common';

import { IntensionAnalyticsModuleOptions } from './intension-analytics-module-options.interface';

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN: INTENSION_ANALYTICS_MODULE_OPTIONS,
    OPTIONS_TYPE: INTENSION_ANALYTICS_OPTIONS_TYPE,
    ASYNC_OPTIONS_TYPE: INTENSION_ANALYTICS_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<IntensionAnalyticsModuleOptions>().build();
