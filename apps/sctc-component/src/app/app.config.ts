import { registerAs } from '@nestjs/config';

export type ContractComposerConfig = {
    metadataRepositoryUrl: string;
    name: string;
    port: number;
    keycloak: {
        url: string;
        realm: string;
        clientId: string;
        clientSecret: string;
    };
    isDevelopment: boolean;
    swaggerBaseUrl: string;
    catalogKey: string;
};

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
        catalogKey: process.env.CATALOG_API_KEY,
        isDevelopment: process.env.NODE_ENV !== 'production',
        swaggerBaseUrl: process.env.SWAGGER_BASE_URL ?? '/',
        metadataRepositoryUrl: process.env.METADATA_REPOSITORY_URL,
    }),
);
