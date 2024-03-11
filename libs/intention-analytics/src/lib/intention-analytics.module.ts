import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { QuestionnaireController } from './controllers';
import { Answer } from './entities';
import { Question } from './entities/question.entity';
import { Questionnaire } from './entities/questionnaire.entity';
import { QuestionnaireService } from './services';
import { AnswersService } from './services/answers.service';

@Module({
    imports: [MikroOrmModule.forFeature([Questionnaire, Question, Answer])],
    controllers: [QuestionnaireController],
    providers: [QuestionnaireService, AnswersService],
})
export class IntentionAnalyticsModule {}
