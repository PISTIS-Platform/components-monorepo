import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { DynamicModule, Module } from '@nestjs/common';
import { BlockchainModule } from '@pistis/blockchain';

import { QuestionnaireController } from './controllers';
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
    imports: [MikroOrmModule.forFeature([Questionnaire, Question, Answer]), HttpModule],
    controllers: [QuestionnaireController],
    providers: [QuestionnaireService, AnswersService],
})
export class IntentionAnalyticsModule extends ConfigurableModuleClass {
    static register(options: typeof INTENSION_ANALYTICS_OPTIONS_TYPE): DynamicModule {
        return {
            imports: [BlockchainModule.register({ url: options.blockchainUrl })],
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
                useFactory: (config: typeof asyncOptions.inject) => {
                    const options: any = asyncOptions.useFactory ? asyncOptions.useFactory(config) : {};

                    return { url: options.blockchainUrl };
                },
            }),
        ];

        return { ...parent };
    }
}
