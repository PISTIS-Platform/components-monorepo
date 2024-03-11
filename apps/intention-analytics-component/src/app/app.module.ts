import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MiddlewareConsumer, Module, NestModule, NotFoundException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IntentionAnalyticsModule } from '@pistis/intention-analytics';
import { MorganMiddleware } from '@pistis/shared';

import { AppConfig, IAppConfig } from './app.config';

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
                findOneOrFailHandler: (entityName: string) => {
                    return new NotFoundException(`${entityName} not found!`);
                },
            }),
            inject: [AppConfig.KEY],
        }),
        IntentionAnalyticsModule,
    ],
    controllers: [],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(MorganMiddleware).forRoutes('*');
    }
}
