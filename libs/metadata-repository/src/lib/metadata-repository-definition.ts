import { ConfigurableModuleBuilder } from '@nestjs/common';

import { MetadataRepositoryModuleOptions } from './metadata-repository-options.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
    new ConfigurableModuleBuilder<MetadataRepositoryModuleOptions>().build();
