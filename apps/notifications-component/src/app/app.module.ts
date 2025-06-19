import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { NotificationsModule } from '@pistis/notifications';
import { IAppConfig, MorganMiddleware } from '@pistis/shared';
import {
    AuthGuard,
    KeycloakConnectModule,
    PolicyEnforcementMode,
    RoleGuard,
    TokenValidation,
} from 'nest-keycloak-connect';

import { AppConfig } from './app.config';

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
                allowGlobalContext: false,
            }),
            inject: [AppConfig.KEY],
        }),
        NotificationsModule,
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
