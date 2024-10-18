import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ConsumerModule } from '@pistis/consumer';
import { ProviderModule } from '@pistis/provider';
import { IAppConfig, MorganMiddleware } from '@pistis/shared';
import { AuthGuard, KeycloakConnectModule, PolicyEnforcementMode, RoleGuard, TokenValidation } from 'nest-keycloak-connect';

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
                downloadBatchSize: options.downloadBatchSize,
                metadataRepositoryUrl: options.metadataRepositoryUrl,
                catalogId: options.catalogId,
                catalogKey: options.catalogKey,
                catalogUrl: options.catalogUrl,
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
        KeycloakConnectModule.registerAsync({
            imports: [ConfigModule.forFeature(AppConfig)],
            inject: [AppConfig.KEY],
            useFactory: (options: IAppConfig) => ({
                authServerUrl: options.keycloak.url,
                realm: options.keycloak.realm,
                clientId: options.keycloak.clientId,
                secret: options.keycloak.clientSecret,
                useNestLogger: true,
                policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
                tokenValidation: TokenValidation.OFFLINE,
            }),
        }),
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
        {
            provide: APP_GUARD,
            useClass: RoleGuard,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(MorganMiddleware).forRoutes('*');
    }
}
