import { MikroOrmModule } from '@mikro-orm/nestjs';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { NestjsFormDataModule } from 'nestjs-form-data';

import { ModelRepository } from './model-repository.entity';
import { ModelsRepositoryController } from './models-repository.controller';
import { ModelsRepositoryService } from './models-repository.service';

@Module({
    imports: [MikroOrmModule.forFeature([ModelRepository]), HttpModule, NestjsFormDataModule],
    controllers: [ModelsRepositoryController],
    providers: [ModelsRepositoryService],
    exports: [],
})
export class ModelsRepositoryModule {}
