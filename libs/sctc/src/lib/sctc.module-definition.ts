import { ConfigurableModuleBuilder } from '@nestjs/common';

import { SCTCModuleOptions } from './sctc-module-options.interface';

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN: SCTC_MODULE_OPTIONS,
    OPTIONS_TYPE: SCTC_OPTIONS_TYPE,
    ASYNC_OPTIONS_TYPE: SCTC_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<SCTCModuleOptions>().build();
