import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IAppConfig, MorganMiddleware } from '@pistis/shared';
import { TransactionsAuditorModule } from '@pistis/transactions-auditor';

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
        TransactionsAuditorModule,
    ],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(MorganMiddleware).forRoutes('*');
    }
}
