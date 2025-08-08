// libs/shared/bullmq-shared/src/lib/bullmq-dashboard.module.ts
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter'; // Correct adapter for BullMQ
// If the above import still causes issues, try:
// import { BullMQAdapter } from '@bull-board/bullmq'; // Some versions export this explicitly
import { ExpressAdapter } from '@bull-board/express';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { DynamicModule, Logger, Module, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpAdapterHost } from '@nestjs/core';
import { Queue } from 'bullmq';
import { NextFunction, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken'; // For JWT validatio

import { CLIENT_SYNC } from './bullMq.constants';
import { BullMqModule } from './bullMq.module';

@Module({})
export class BullmqDashboardModule implements OnModuleInit {
    private readonly logger = new Logger(BullmqDashboardModule.name);

    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly configService: ConfigService,
        @InjectQueue(CLIENT_SYNC) private readonly clientSyncQueue: Queue, // Add other queues here if you want them displayed in the dashboard: // @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue, // @InjectQueue(QUEUE_NAMES.IMAGE_PROCESSING) private readonly imageProcessingQueue: Queue, // @InjectQueue(QUEUE_NAMES.REPORT_GENERATION) private readonly reportGenerationQueue: Queue,
    ) {}

    private keycloakAuthMiddleware(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Throwing an exception here will be caught by NestJS's exception filter
            throw new UnauthorizedException('Authentication required to access Bull Dashboard.');
        }

        const token = authHeader.split(' ')[1];
        // console.log(token);

        try {
            // You must provide the Keycloak realm's public key here.
            // The `jsonwebtoken` library will use it to verify the token's signature.
            const publicKey = 'o6es3LPwnrghkX7e3urrwVnj5J7mvE8K'; // Get from config
            const realm = 'PISTIS'; // Get from config
            const authServerUrl = 'https://auth.pistis-market.eu'; // Get from config

            if (!publicKey || !realm || !authServerUrl) {
                throw new Error('Keycloak configuration is missing.');
            }

            jwt.verify(token, publicKey, {
                issuer: `${authServerUrl}/realms/${realm}`,
                algorithms: ['RS256'],
            });

            // You can add additional checks here, like for specific roles or scopes:
            // const decodedPayload: any = jwt.decode(token);
            // if (!decodedPayload.realm_access.roles.includes('admin')) {
            //   throw new UnauthorizedException('Insufficient permissions.');
            // }

            next(); // Authentication successful, pass to the next middleware
        } catch (err) {
            console.log(err);
            this.logger.error('JWT validation failed:', err.message);
            throw new UnauthorizedException('Invalid or expired token.');
        }
    }

    onModuleInit() {
        this.logger.log('Initializing Bull Dashboard...');
        const { httpAdapter } = this.httpAdapterHost;

        if (!httpAdapter || !httpAdapter.getInstance) {
            this.logger.error(
                'HttpAdapterHost does not provide an Express instance. Bull Dashboard cannot be mounted.',
            );
            return;
        }
        const expressApp = httpAdapter.getInstance();

        const serverAdapter = new ExpressAdapter();
        serverAdapter.setBasePath('/admin/queues');

        createBullBoard({
            queues: [
                new BullAdapter(this.clientSyncQueue as any), // Ensure this BullAdapter is from @bull-board/bullmq
                // If using BullMQAdapter: new BullMQAdapter(this.clientSyncQueue),
                // Add other queues here if you injected them above:
                // new BullAdapter(this.emailQueue),
                // new BullAdapter(this.imageProcessingQueue),
                // new BullAdapter(this.reportGenerationQueue),
            ],
            serverAdapter,
        });

        // const keycloakConfig: any = {
        //     clientId: '',
        //     bearerOnly: true,
        //     serverUrl: '',
        //     realm: '',
        //     credentials: {
        //         secret: '',
        //     },
        // };

        // const keycloak = new Keycloak({}, keycloakConfig);
        // expressApp.use(keycloak.middleware());

        // expressApp.use('/admin/queues', keycloak.protect(), serverAdapter.getRouter());

        expressApp.use(
            '/admin/queues',
            // The middleware function needs to be bound to `this` to access class properties
            this.keycloakAuthMiddleware.bind(this),
            serverAdapter.getRouter(),
        );
        this.logger.log('Bull Dashboard mounted at /admin/queues');
    }

    static register(): DynamicModule {
        return {
            module: BullmqDashboardModule,
            imports: [BullMqModule, BullModule.registerQueue(), ConfigModule],
        };
    }
}
