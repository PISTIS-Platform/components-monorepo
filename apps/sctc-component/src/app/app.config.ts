import { registerAs } from '@nestjs/config';
import { IAppConfig } from '@pistis/shared';

type ContractComposerConfig = Omit<IAppConfig, 'database'>;

export const AppConfig = registerAs(
    'app',
    (): ContractComposerConfig => ({
        name: process.env.APP_NAME,
        port: +process.env.APP_PORT,
        keycloak: {
            url: process.env.KC_URL,
            realm: process.env.KC_REALM,
            clientId: process.env.KC_CLIENT_ID,
            clientSecret: process.env.KC_CLIENT_SECRET,
        },
        isDevelopment: process.env.NODE_ENV !== 'production',
        swaggerBaseUrl: process.env.SWAGGER_BASE_URL ?? '/',
    }),
);
