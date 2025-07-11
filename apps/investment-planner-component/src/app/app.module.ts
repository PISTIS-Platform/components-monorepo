import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InvestmentPlannerModule } from '@pistis/investment-planner';
import { IAppConfig, MorganMiddleware } from '@pistis/shared';

import { AppConfig, IInvestmentPlannerConfig } from './app.config';

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
        // KeycloakConnectModule.registerAsync({
        //     imports: [ConfigModule.forFeature(AppConfig)],
        //     inject: [AppConfig.KEY],
        //     useFactory: (options: IAppConfig) => ({
        //         authServerUrl: options.keycloak.url,
        //         realm: options.keycloak.realm,
        //         clientId: options.keycloak.clientId,
        //         secret: options.keycloak.clientSecret,
        //         useNestLogger: true,
        //         policyEnforcement: PolicyEnforcementMode.PERMISSIVE,
        //         tokenValidation: TokenValidation.OFFLINE,
        //     }),
        // }),
        InvestmentPlannerModule.registerAsync({
            imports: [ConfigModule.forFeature(AppConfig)],
            useFactory: async (options: IInvestmentPlannerConfig) => ({
                notificationsUrl: options.notificationsUrl,
                factoryRegistryUrl: options.factoryRegistryUrl,
                catalogId: options.catalogId,
                catalogKey: options.catalogKey,
                catalogUrl: options.catalogUrl,
                clientId: options.keycloak.clientId,
                secret: options.keycloak.clientSecret,
                authServerUrl: options.keycloak.url,
            }),
            inject: [AppConfig.KEY],
        }),
    ],
    providers: [
        // {
        //     provide: APP_GUARD,
        //     useClass: AuthGuard,
        // },
        // {
        //     provide: APP_GUARD,
        //     useClass: RoleGuard,
        // },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(MorganMiddleware).forRoutes('*');
    }
}
