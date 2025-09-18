import { registerAs } from '@nestjs/config';
import { IAppConfig } from '@pistis/shared';

export type INotificationsConfig = IAppConfig & {
    transactionAuditorUrl: string;
};

export const AppConfig = registerAs(
    'app',
    (): INotificationsConfig => ({
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
        swaggerBaseUrl: process.env.SWAGGER_BASE_URL ?? '/',
        transactionAuditorUrl: process.env.TRANSACTION_AUDITOR_URL,
    }),
);
