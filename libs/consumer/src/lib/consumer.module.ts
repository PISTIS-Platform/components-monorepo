import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BullmqDashboardModule, BullMqModule } from '@pistis/bull-mq';
import { DataStorageModule } from '@pistis/data-storage';
import { KafkaModule } from '@pistis/kafka';
import { MetadataRepositoryModule } from '@pistis/metadata-repository';

import { ComponentHealthController } from './component-health.controller';
import { ConnectorProcessor } from './connector.processor';
import { ConsumerController } from './consumer.controller';
import {
    ConfigurableModuleClass,
    CONSUMER_ASYNC_OPTIONS_TYPE,
    CONSUMER_OPTIONS_TYPE,
} from './consumer.module-definition';
import { ConsumerService } from './consumer.service';
import { AssetRetrievalInfo } from './entities/asset-retrieval-info.entity';

@Module({
    imports: [
        MikroOrmModule.forFeature([AssetRetrievalInfo]),
        BullMqModule,
        BullmqDashboardModule.register(),
        HttpModule,
        TerminusModule,
        KafkaModule,
    ],
    controllers: [ConsumerController, ComponentHealthController],
    providers: [ConsumerService, ConnectorProcessor],
    exports: [],
})
export class ConsumerModule extends ConfigurableModuleClass {
    static register(options: typeof CONSUMER_OPTIONS_TYPE): DynamicModule {
        return {
            imports: [
                DataStorageModule.register({ url: options.dataStorageUrl }),
                MetadataRepositoryModule.register({
                    url: options.metadataRepositoryUrl,
                    apiKey: options.catalogKey,
                    cloudURL: options.cloudURL,
                }),
            ],

            ...super.register(options),
        };
    }

    static registerAsync(asyncOptions: typeof CONSUMER_ASYNC_OPTIONS_TYPE): DynamicModule {
        const parent = super.registerAsync(asyncOptions);

        parent.imports = [
            ...(parent.imports ?? []),
            DataStorageModule.registerAsync({
                imports: asyncOptions?.imports,
                inject: asyncOptions?.inject,
                useFactory: async (config: typeof asyncOptions.inject) => {
                    const options: any = asyncOptions.useFactory ? await asyncOptions.useFactory(config) : {};

                    return { url: options.dataStorageUrl };
                },
            }),
            MetadataRepositoryModule.registerAsync({
                imports: asyncOptions?.imports,
                inject: asyncOptions?.inject,
                useFactory: async (config: typeof asyncOptions.inject) => {
                    const options: any = asyncOptions.useFactory ? await asyncOptions.useFactory(config) : {};

                    return {
                        url: options.metadataRepositoryUrl,
                        apiKey: options.catalogKey,
                        cloudURL: options.cloudURL,
                    };
                },
            }),
        ];

        return { ...parent };
    }
}
