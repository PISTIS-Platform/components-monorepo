import { ConfigurableModuleBuilder } from '@nestjs/common';

import { NotificationsModuleOptions } from './notifications-module-options.interface';

export const {
    ConfigurableModuleClass,
    MODULE_OPTIONS_TOKEN: NOTIFICATIONS_MODULE_OPTIONS,
    OPTIONS_TYPE: NOTIFICATIONS_OPTIONS_TYPE,
    ASYNC_OPTIONS_TYPE: NOTIFICATIONS_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<NotificationsModuleOptions>().build();
