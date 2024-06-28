import { ConfigurableModuleBuilder } from '@nestjs/common';

import { FactoryModuleOptions } from './factories-registrant-module-options.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
    new ConfigurableModuleBuilder<FactoryModuleOptions>().build();
