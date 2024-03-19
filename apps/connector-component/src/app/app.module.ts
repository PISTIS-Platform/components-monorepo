import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ConsumerModule } from '@pistis/consumer';
import { ProviderModule } from '@pistis/provider';
import { IAppConfig, MorganMiddleware } from '@pistis/shared';

import { AppConfig, IConnectorConfig } from './app.config';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        ConfigModule.forFeature(AppConfig),
        MikroOrmModule.forRootAsync({
            imports: [ConfigModule.forFeature(AppConfig)],
            useFactory: async (options: IAppConfig) => ({
                driver: PostgreSqlDriver,
                ...options.database,
                autoLoadEntities: true,
            }),
            inject: [AppConfig.KEY],
        }),
        ConsumerModule.registerAsync({
            imports: [ConfigModule.forFeature(AppConfig)],
            useFactory: async (options: IConnectorConfig) => ({
                dataStorageUrl: options.dataStorageUrl,
                notificationsUrl: options.notificationsUrl,
                factoryRegistryUrl: options.factoryRegistryUrl,
                downloadBatchSize: options.downloadBatchSize
            }),
            inject: [AppConfig.KEY],
        }),
        ProviderModule.registerAsync({
            imports: [ConfigModule.forFeature(AppConfig)],
            useFactory: async (options: IConnectorConfig) => ({
                dataStorageUrl: options.dataStorageUrl,
                blockchainUrl: options.blockchainUrl,
                metadataRepositoryUrl: options.metadataRepositoryUrl,
            }),
            inject: [AppConfig.KEY],
        }),
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(MorganMiddleware).forRoutes('*');
    }
}
