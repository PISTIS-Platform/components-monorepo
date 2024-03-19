import { ConfigurableModuleBuilder } from '@nestjs/common';

import { DataStorageModuleOptions } from './data-storage-module-options.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
    new ConfigurableModuleBuilder<DataStorageModuleOptions>().build();
