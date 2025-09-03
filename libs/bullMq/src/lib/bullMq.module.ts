import { BullModule } from '@nestjs/bull'; // Corrected type: BullModuleOptions
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { BullMqService } from './bull-mq.service';
import { CONNECTOR_QUEUE } from './bullMq.constants';

@Module({
    imports: [
        ConfigModule,
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                redis: {
                    host: configService.get('app.redis.host'),
                    port: configService.get('app.redis.port'),
                },
            }),
        }),
        // Register the queue with default job options
        BullModule.registerQueue({
            name: CONNECTOR_QUEUE,
            defaultJobOptions: {
                attempts: 3, // Retry up to 3 times
                backoff: {
                    type: 'exponential', // Exponential backoff strategy
                    delay: 3000, // Initial delay of 3 seconds
                },
            },
        }),
    ],
    providers: [BullMqService],
    exports: [BullModule, BullMqService],
})
export class BullMqModule {}
