import { DynamicModule, Module } from '@nestjs/common';
import { BullModule, BullModuleOptions } from '@nestjs/bull'; // Corrected type: BullModuleOptions
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullMqService } from './bull-mq.service';

@Module({
    imports: [
        ConfigModule,
        BullModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                redis: {
                    host: configService.get('app.redisHost'), // Replace with your Redis host
                    port: configService.get('app.redisPort'), // Replace with your Redis port
                },
            }),
        }),
        // Register the queue with default job options
        BullModule.registerQueue({
            name: 'default',
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
