import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app/app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, { cors: true });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());

    const config = app.get(ConfigService);
    const port = config.get<number>('app.port', 3000);

    const swaggerConfig = new DocumentBuilder()
        .setTitle(config.get('app.name'))
        .setVersion('1.0')
        .addTag('notifications')
        .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api', app, document);

    await app.listen(port);
    Logger.log(`🚀 Application "${config.get('app.name')}" is running on port ${port}`);
}

bootstrap();
