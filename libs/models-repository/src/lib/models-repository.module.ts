import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { NestjsFormDataModule } from 'nestjs-form-data';

import { ComponentHealthController } from './component-health.controller';
import { ModelRepository } from './model-repository.entity';
import { ModelsRepositoryController } from './models-repository.controller';
import { ModelsRepositoryService } from './models-repository.service';

@Module({
    imports: [MikroOrmModule.forFeature([ModelRepository]), HttpModule, NestjsFormDataModule, TerminusModule],
    controllers: [ModelsRepositoryController, ComponentHealthController],
    providers: [ModelsRepositoryService],
    exports: [],
})
export class ModelsRepositoryModule {}
