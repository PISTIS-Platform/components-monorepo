import { ConfigurableModuleBuilder } from '@nestjs/common';

import { ConsumerModuleOptions } from './consumer-module-options.interface';

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN: CONSUMER_MODULE_OPTIONS,
    OPTIONS_TYPE: CONSUMER_OPTIONS_TYPE,
    ASYNC_OPTIONS_TYPE: CONSUMER_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ConsumerModuleOptions>().build(); 
