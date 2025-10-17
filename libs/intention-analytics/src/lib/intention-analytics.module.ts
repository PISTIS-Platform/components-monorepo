import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { BlockchainModule } from '@pistis/blockchain';
import { MetadataRepositoryModule } from '@pistis/metadata-repository';

import { QuestionnaireController } from './controllers';
import { ComponentHealthController } from './controllers/component-health.controller';
import { Answer } from './entities';
import { Question } from './entities/question.entity';
import { Questionnaire } from './entities/questionnaire.entity';
import {
    ConfigurableModuleClass,
    INTENSION_ANALYTICS_ASYNC_OPTIONS_TYPE,
    INTENSION_ANALYTICS_OPTIONS_TYPE,
} from './intension-analytics.module-definition';
import { QuestionnaireService } from './services';
import { AnswersService } from './services/answers.service';

@Module({
    imports: [MikroOrmModule.forFeature([Questionnaire, Question, Answer]), HttpModule, TerminusModule],
    controllers: [QuestionnaireController, ComponentHealthController],
    providers: [QuestionnaireService, AnswersService],
})
export class IntentionAnalyticsModule extends ConfigurableModuleClass {
    static register(options: typeof INTENSION_ANALYTICS_OPTIONS_TYPE): DynamicModule {
        return {
            imports: [
                BlockchainModule.register({ url: options.blockchainUrl }),
                MetadataRepositoryModule.register({
                    url: options.metadataRepositoryUrl,
                    apiKey: options.catalogKey,
                    cloudURL: options.cloudURL,
                }),
            ],
            ...super.register(options),
        };
    }

    static registerAsync(asyncOptions: typeof INTENSION_ANALYTICS_ASYNC_OPTIONS_TYPE): DynamicModule {
        const parent = super.registerAsync(asyncOptions);

        parent.imports = [
            ...(parent.imports ?? []),
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
