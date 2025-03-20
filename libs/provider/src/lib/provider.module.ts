import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { BlockchainModule } from '@pistis/blockchain';
import { DataStorageModule } from '@pistis/data-storage';
import { MetadataRepositoryModule } from '@pistis/metadata-repository';

import { ProviderController } from './provider.controller';
import {
    ConfigurableModuleClass,
    PROVIDER_ASYNC_OPTIONS_TYPE,
    PROVIDER_OPTIONS_TYPE,
} from './provider.module-definition';
import { ProviderService } from './provider.service';

@Module({
    imports: [HttpModule],
    controllers: [ProviderController],
    providers: [ProviderService],
    exports: [],
})
export class ProviderModule extends ConfigurableModuleClass {
    static register(options: typeof PROVIDER_OPTIONS_TYPE): DynamicModule {
        return {
            imports: [
                DataStorageModule.register({ url: options.dataStorageUrl }),
                BlockchainModule.register({ url: options.blockchainUrl }),
                MetadataRepositoryModule.register({ url: options.metadataRepositoryUrl, apiKey: options.catalogKey }),
            ],
            ...super.register(options),
        };
    }

    static registerAsync(asyncOptions: typeof PROVIDER_ASYNC_OPTIONS_TYPE): DynamicModule {
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
            BlockchainModule.registerAsync({
                imports: asyncOptions?.imports,
                inject: asyncOptions?.inject,
                useFactory: async (config: typeof asyncOptions.inject) => {
                    const options: any = asyncOptions.useFactory ? await asyncOptions.useFactory(config) : {};

                    return { url: options.blockchainUrl };
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
