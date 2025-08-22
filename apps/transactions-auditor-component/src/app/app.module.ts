import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MorganMiddleware } from '@pistis/shared';

import { AppConfig } from './app.config';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true, load: [AppConfig] })],
    providers: [],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer.apply(MorganMiddleware).forRoutes('*');
    }
}
