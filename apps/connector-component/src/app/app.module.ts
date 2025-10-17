import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ConsumerModule } from '@pistis/consumer';
import { KafkaModule } from '@pistis/kafka';
import { ProviderModule } from '@pistis/provider';
import { IAppConfig, MorganMiddleware } from '@pistis/shared';
import {
    AuthGuard,
    KeycloakConnectModule,
    PolicyEnforcementMode,
    RoleGuard,
    TokenValidation,
} from 'nest-keycloak-connect';

import { AppConfig, IConnectorConfig } from './app.config';
import { KafkaConfig } from './kafka.config';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [AppConfig, KafkaConfig] }),
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
                factoryRegistryUrl: options.factoryRegistryUrl,
                downloadBatchSize: options.downloadBatchSize,
                metadataRepositoryUrl: options.metadataRepositoryUrl,
                catalogId: options.catalogId,
                catalogOwnedId: options.catalogOwnedId,
                catalogKey: options.catalogKey,
                catalogUrl: options.catalogUrl,
                clientId: options.keycloak.clientId,
                secret: options.keycloak.clientSecret,
                authServerUrl: options.keycloak.url,
                organisationFullname: options.organisationFullname,
                notificationsUrl: options.notificationsUrl,
                transactionAuditorUrl: options.transactionAuditorUrl,
                cloudURL: options.cloudURL,
            }),
            inject: [AppConfig.KEY],
        }),
        ProviderModule.registerAsync({
            imports: [ConfigModule.forFeature(AppConfig)],
            useFactory: async (options: IConnectorConfig) => ({
                dataStorageUrl: options.dataStorageUrl,
                blockchainUrl: options.blockchainUrl,
                metadataRepositoryUrl: options.metadataRepositoryUrl,
                clientId: options.keycloak.clientId,
                secret: options.keycloak.clientSecret,
                authServerUrl: options.keycloak.url,
                catalogKey: options.catalogKey,
                factoryRegistryUrl: options.factoryRegistryUrl,
                catalogOwnedId: options.catalogOwnedId,
                organisationFullname: options.organisationFullname,
                factoryPrefix: options.factoryPrefix,
                cloudURL: options.cloudURL,
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
        KafkaModule,
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
