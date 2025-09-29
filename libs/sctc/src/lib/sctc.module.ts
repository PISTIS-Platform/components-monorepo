import { DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MetadataRepositoryModule } from '@pistis/metadata-repository';

import { ComponentHealthController } from './component-health.controller';
import { SCTCController } from './sctc.controller';
import { ConfigurableModuleClass, SCTC_ASYNC_OPTIONS_TYPE, SCTC_OPTIONS_TYPE } from './sctc.module-definition';
import { SCTCService } from './sctc.service';

@Module({
    imports: [TerminusModule],
    controllers: [SCTCController, ComponentHealthController],
    providers: [SCTCService],
    exports: [],
})
export class SCTCModule extends ConfigurableModuleClass {
    static register(options: typeof SCTC_OPTIONS_TYPE): DynamicModule {
        return {
            imports: [
                MetadataRepositoryModule.register({ url: options.metadataRepositoryUrl, apiKey: options.catalogKey }),
            ],

            ...super.register(options),
        };
    }

    static registerAsync(asyncOptions: typeof SCTC_ASYNC_OPTIONS_TYPE): DynamicModule {
        const parent = super.registerAsync(asyncOptions);

        parent.imports = [
            ...(parent.imports ?? []),
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
