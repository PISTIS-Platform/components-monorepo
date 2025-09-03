import { registerAs } from '@nestjs/config';
import { IAppConfig, IRedisConfig } from '@pistis/shared';

export type IFactoryConfig = IAppConfig & {
    identityAccessManagementUrl: string;
    notificationsUrl: string;
    redis: IRedisConfig;
};

export const AppConfig = registerAs(
    'app',
    (): IFactoryConfig => ({
        name: process.env.APP_NAME,
        port: +process.env.APP_PORT,
        database: {
            host: process.env.DB_HOST,
            port: +process.env.DB_PORT,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            dbName: process.env.DB_NAME,
        },
        keycloak: {
            url: process.env.KC_URL,
            realm: process.env.KC_REALM,
            clientId: process.env.KC_CLIENT_ID,
            clientSecret: process.env.KC_CLIENT_SECRET,
        },
        isDevelopment: process.env.NODE_ENV !== 'production',
        notificationsUrl: process.env.NOTIFICATIONS_URL,
        identityAccessManagementUrl: process.env.IDENTITY_ACCESS_MANAGEMENT_URL,
        swaggerBaseUrl: process.env.SWAGGER_BASE_URL ?? '/',
        redis: {
            host: process.env.REDIS_HOST,
            port: +process.env.REDIS_PORT,
        },
    }),
);
