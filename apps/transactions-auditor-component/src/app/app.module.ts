import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { IAppConfig, MorganMiddleware } from '@pistis/shared';
import { TransactionsAuditorModule } from '@pistis/transactions-auditor';
import { AuthGuard, KeycloakConnectModule, PolicyEnforcementMode, TokenValidation } from 'nest-keycloak-connect';

import { AppConfig } from './app.config';
@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [AppConfig] }),
        MikroOrmModule.forRootAsync({
            imports: [ConfigModule.forFeature(AppConfig)],
            useFactory: async (options: IAppConfig) => ({
                driver: PostgreSqlDriver,
                ...options.database,
                autoLoadEntities: true,
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
        TransactionsAuditorModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: AuthGuard,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(MorganMiddleware).forRoutes('*');
    }
}
