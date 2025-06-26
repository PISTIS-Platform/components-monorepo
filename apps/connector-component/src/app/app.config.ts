import { registerAs } from '@nestjs/config';
import { IAppConfig } from '@pistis/shared';

export type IConnectorConfig = IAppConfig & {
    dataStorageUrl: string;
    notificationsUrl: string;
    factoryRegistryUrl: string;
    blockchainUrl: string;
    metadataRepositoryUrl: string;
    downloadBatchSize: number;
    catalogId: string;
    catalogOwnedId: string;
    catalogKey: string;
    catalogUrl: string;
};

export const AppConfig = registerAs(
    'app',
    (): IConnectorConfig => ({
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
        dataStorageUrl: process.env.DATA_STORE_URL,
        notificationsUrl: process.env.CLOUD_URL,
        factoryRegistryUrl: process.env.FACTORY_REGISTRY_URL,
        blockchainUrl: process.env.BLOCKCHAIN_URL,
        metadataRepositoryUrl: process.env.METADATA_REPOSITORY_URL,
        downloadBatchSize: +process.env.DOWNLOAD_BATCH_SIZE,
        isDevelopment: process.env.NODE_ENV !== 'production',
        swaggerBaseUrl: process.env.SWAGGER_BASE_URL ?? '/',
        catalogId: process.env.CATALOG_ACQUIRED_ID,
        catalogKey: process.env.CATALOG_API_KEY,
        catalogUrl: process.env.CATALOG_URL,
        catalogOwnedId: process.env.CATALOG_OWNED_ID,
    }),
);
