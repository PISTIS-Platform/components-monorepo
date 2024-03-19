import { registerAs } from '@nestjs/config';
import { IAppConfig } from '@pistis/shared';

export type IConnectorConfig = IAppConfig & {
    dataStorageUrl: string;
    notificationsUrl: string;
    factoryRegistryUrl: string;
    blockchainUrl: string;
    metadataRepositoryUrl: string;
    downloadBatchSize: number
};

export const AppConfig = registerAs(
    'app',
    (): IConnectorConfig => ({
        name: process.env.APP_NAME,
        port: +process.env.APP_PORT,
        database: {
            host: process.env.DB_HOST,
            port: +process.env.DB_PORT,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            dbName: process.env.DB_NAME,
        },
        dataStorageUrl: process.env.DATA_STORE_URL,
        notificationsUrl: process.env.NOTIFICATIONS_URL,
        factoryRegistryUrl: process.env.FACTORY_REGISTRY_URL,
        blockchainUrl: process.env.BLOCKCHAIN_URL,
        metadataRepositoryUrl: process.env.METADATA_REPOSITORY_URL,
        downloadBatchSize: +process.env.DOWNLOAD_BATCH_SIZE,
    }),
);
