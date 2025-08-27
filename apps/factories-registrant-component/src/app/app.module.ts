import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { FactoriesRegistrantModule } from '@pistis/factories-registrant';
import { IAppConfig, MorganMiddleware } from '@pistis/shared';
import {
    AuthGuard,
    KeycloakConnectModule,
    PolicyEnforcementMode,
    RoleGuard,
    TokenValidation,
} from 'nest-keycloak-connect';

import { AppConfig, IFactoryConfig } from './app.config';

// import { MailerModule } from '@nestjs-modules/mailer';

const isDevelopment = process.env.NODE_ENV !== 'production';

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
        FactoriesRegistrantModule.registerAsync({
            imports: [ConfigModule.forFeature(AppConfig)],
            useFactory: async (options: IFactoryConfig) => ({
                notificationsUrl: options.notificationsUrl,
                identityAccessManagementUrl: options.identityAccessManagementUrl,
                clientId: options.keycloak.clientId,
                secret: options.keycloak.clientSecret,
                authServerUrl: options.keycloak.url,
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
        // MailerModule.forRoot({
        //     transport: isDevelopment
        //         ? {
        //               //jsonTransport for testing / dev purposes
        //               //used to simulate sending emails
        //               jsonTransport: true,
        //           }
        //         : {
        //               host: 'smtp.example.com', //FIXME: replace with SMTP host
        //               port: 587, // typically 587 for TLS or 465 for SSL
        //               secure: false, // true if using port 465
        //               auth: {
        //                   user: 'your_username', //FIXME: replace with username
        //                   pass: 'your_password', //FIXME: replace with password
        //               },
        //           },
        //     defaults: {
        //         from: '"PISTIS" <pistis_admin@pistis.eu>', //FIXME: Replace with official default from
        //     },
        // }),
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
