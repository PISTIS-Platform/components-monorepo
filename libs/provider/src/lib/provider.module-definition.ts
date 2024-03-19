import { ConfigurableModuleBuilder } from '@nestjs/common';

import { ProviderModuleOptions } from './provider-module-options.interface';

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN: PROVIDER_MODULE_OPTIONS,
    OPTIONS_TYPE: PROVIDER_OPTIONS_TYPE,
    ASYNC_OPTIONS_TYPE: PROVIDER_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ProviderModuleOptions>().build();
