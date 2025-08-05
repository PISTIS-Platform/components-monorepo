// libs/shared/bullmq-shared/src/lib/bullmq-dashboard.module.ts
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter'; // Correct adapter for BullMQ
// If the above import still causes issues, try:
// import { BullMQAdapter } from '@bull-board/bullmq'; // Some versions export this explicitly
import { ExpressAdapter } from '@bull-board/express';
import { BullModule, InjectQueue } from '@nestjs/bull';
import { DynamicModule, Logger, Module, OnModuleInit } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Queue } from 'bullmq';

import { CLIENT_SYNC } from './bullMq.constants';
import { BullMqModule } from './bullMq.module';

@Module({})
export class BullmqDashboardModule implements OnModuleInit {
    private readonly logger = new Logger(BullmqDashboardModule.name);

    constructor(
        private readonly httpAdapterHost: HttpAdapterHost,
        @InjectQueue(CLIENT_SYNC) private readonly clientSyncQueue: Queue, // Add other queues here if you want them displayed in the dashboard: // @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue, // @InjectQueue(QUEUE_NAMES.IMAGE_PROCESSING) private readonly imageProcessingQueue: Queue, // @InjectQueue(QUEUE_NAMES.REPORT_GENERATION) private readonly reportGenerationQueue: Queue,
    ) {}

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

        expressApp.use('/admin/queues', serverAdapter.getRouter());
        this.logger.log('Bull Dashboard mounted at /admin/queues');
    }

    static register(): DynamicModule {
        return {
            module: BullmqDashboardModule,
            imports: [BullMqModule, BullModule.registerQueue()],
        };
    }
}
