import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DataStorageModule } from '@pistis/data-storage';
import { MetadataRepositoryModule } from '@pistis/metadata-repository';

import { AssetRetrievalInfo } from './asset-retrieval-info.entity';
import { ComponentHealthController } from './component-health.controller';
import { ConsumerController } from './consumer.controller';
import {
    ConfigurableModuleClass,
    CONSUMER_ASYNC_OPTIONS_TYPE,
    CONSUMER_OPTIONS_TYPE,
} from './consumer.module-definition';
import { ConsumerService } from './consumer.service';

@Module({
    imports: [MikroOrmModule.forFeature([AssetRetrievalInfo]), HttpModule, TerminusModule],
    controllers: [ConsumerController, ComponentHealthController],
    providers: [ConsumerService],
    exports: [],
})
export class ConsumerModule extends ConfigurableModuleClass {
    static register(options: typeof CONSUMER_OPTIONS_TYPE): DynamicModule {
        return {
            imports: [
                DataStorageModule.register({ url: options.dataStorageUrl }),
                MetadataRepositoryModule.register({ url: options.metadataRepositoryUrl, apiKey: options.catalogKey }),
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

                    return { url: options.metadataRepositoryUrl, apiKey: options.catalogKey };
                },
            }),
        ];

        return { ...parent };
    }
}
