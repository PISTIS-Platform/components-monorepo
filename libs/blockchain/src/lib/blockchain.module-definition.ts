import { ConfigurableModuleBuilder } from '@nestjs/common';

import { BlockchainModuleOptions } from './blockchain-module-options.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
    new ConfigurableModuleBuilder<BlockchainModuleOptions>().build();
