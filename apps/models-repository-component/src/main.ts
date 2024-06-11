import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { consoleTransport } from '@pistis/shared';
import * as bodyParser from 'body-parser';
import { WinstonModule } from 'nest-winston';

import { AppModule } from './app/app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        cors: true,
        logger: WinstonModule.createLogger({
            level: 'debug',
            transports: [consoleTransport],
        }),
    });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

    const config = app.get(ConfigService);
    const port = config.get<number>('app.port', 3005);

    const swaggerConfig = new DocumentBuilder()
        .setTitle(config.get('app.name'))
        .setVersion('1.0')
        .addTag('models-repository')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);

    await app.listen(port);
    Logger.log(`🚀 Application "${config.get('app.name')}" is running on port ${port}`);
}

bootstrap();
