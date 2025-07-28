/* eslint-disable simple-import-sort/imports */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { oTelemetry } = require('@pistis/shared');
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { consoleTransport } from '@pistis/shared';
import { WinstonModule } from 'nest-winston';
import { OpenTelemetryTransportV3 } from '@opentelemetry/winston-transport';
// Correct adapter for BullMQ
// Express adapter for NestJS

import { AppModule } from './app/app.module';

async function bootstrap() {
    await oTelemetry();
    const app = await NestFactory.create(AppModule, {
        cors: true,
        logger: WinstonModule.createLogger({
            transports: [consoleTransport, new OpenTelemetryTransportV3()],
        }),
    });

    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    // --- Bull Dashboard Integration ---
    // IMPORTANT: Call app.init() *before* registering the dashboard module
    // This ensures all providers (like your BullMQ Queues) are initialized
    // and available for injection into BullmqDashboardModule.
    await app.init();

    // Register the BullmqDashboardModule.
    // Its onModuleInit hook will automatically mount the dashboard.
    // The previous line 'await app.select(BullmqDashboardModule).compile();' is
    // not needed as app.init() handles module compilation and initialization.

    Logger.log(`🚀 Bull Dashboard UI available at: http://localhost:${process.env.PORT || 3004}/admin/queues`);
    // --- End Bull Dashboard Integration ---

    const config = app.get(ConfigService);
    const port = config.get<number>('app.port', 3005);
    const isDevelopment = config.get<boolean>('app.isDevelopment');

    if (isDevelopment) {
        const swaggerBaseUrl = config.get<string>('app.swaggerBaseUrl');
        const swaggerConfig = new DocumentBuilder()
            .setTitle(config.get('app.name'))
            .setVersion('1.0')
            .addTag('factories-registrant')
            .addBearerAuth()
            .addServer(swaggerBaseUrl)
            .build();
        const document = SwaggerModule.createDocument(app, swaggerConfig);
        SwaggerModule.setup('api', app, document);
    }

    await app.listen(port);
    Logger.log(`🚀 Application "${config.get('app.name')}" is running on port ${port}`);
}

bootstrap();
