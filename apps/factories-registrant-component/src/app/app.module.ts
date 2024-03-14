import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FactoriesRegistrantModule } from '@pistis/factories-registrant';
import { IAppConfig, MorganMiddleware } from '@pistis/shared';

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
            }),
            inject: [AppConfig.KEY],
        }),
        FactoriesRegistrantModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(MorganMiddleware).forRoutes('*');
    }
}
