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
// For JWT validatio
import { verify } from 'jsonwebtoken';
import * as jwks from 'jwks-rsa';

// import { Issuer } from 'openid-client';
import { CLIENT_SYNC } from './bullMq.constants';
import { BullMqModule } from './bullMq.module';

@Module({})
export class BullmqDashboardModule implements OnModuleInit {
    private readonly logger = new Logger(BullmqDashboardModule.name);
    private jwksClient: jwks.JwksClient | undefined;

    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        private readonly configService: ConfigService,
        @InjectQueue(CLIENT_SYNC) private readonly clientSyncQueue: Queue, // Add other queues here if you want them displayed in the dashboard: // @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue, // @InjectQueue(QUEUE_NAMES.IMAGE_PROCESSING) private readonly imageProcessingQueue: Queue, // @InjectQueue(QUEUE_NAMES.REPORT_GENERATION) private readonly reportGenerationQueue: Queue,
    ) {}

    private async keycloakAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
        this.jwksClient = new jwks.JwksClient({
            jwksUri: `https://auth.pistis-market.eu/realms/PISTIS/protocol/openid-connect/certs`,
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
            cacheMaxAge: 600_000,
        });

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // Throwing an exception here will be caught by NestJS's exception filter
            throw new UnauthorizedException('Authentication required to access Bull Dashboard.');
        }

        const token = authHeader.split(' ')[1];
        try {
            // Extract the key id (kid) from the header of the token
            const { kid } = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());

            // Retrieve the signing key from the issuer
            const key = await this.jwksClient.getSigningKey(kid);

            // Get the public key
            const publicKey = key.getPublicKey();
            // Verify token, and return payload
            verify(token, publicKey);

            next();
        } catch (err: any) {
            // If anything went wrong, log the reason
            console.log(err.message);
            throw new UnauthorizedException('Invalid token');
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

        expressApp.use('/admin/queues' /*, this.keycloakAuthMiddleware.bind(this)*/, serverAdapter.getRouter());
        this.logger.log('Bull Dashboard mounted at /admin/queues');
    }

    static register(): DynamicModule {
        return {
            module: BullmqDashboardModule,
            imports: [BullMqModule, BullModule.registerQueue(), ConfigModule],
        };
    }
}
