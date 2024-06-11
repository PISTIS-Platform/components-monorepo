import { EntityRepository, wrap } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';

import { CreateModelDTO, UpdateModelDTO } from './dto';
import { ModelRepository } from './model-repository.entity';

@Injectable()
export class ModelsRepositoryService {
    constructor(
        @InjectRepository(ModelRepository)
        private readonly repo: EntityRepository<ModelRepository>,
    ) {}

    async createModel(dataModel: CreateModelDTO) {
        const modelForCreate = {
            size: 0,
            ...dataModel,
        };

        const model = await this.repo.create(modelForCreate);

        model.data = Buffer.from(modelForCreate.data.buffer);
        //Convert bytes to MB
        model.size = Number((modelForCreate.data.size / (1024 * 1024)).toFixed(4));

        model.filepath = modelForCreate.data.originalName;

        this.repo.getEntityManager().persistAndFlush(model);
        return model;
    }

    async updateModel(modelId: string, data: UpdateModelDTO) {
        const model = await this.repo.findOneOrFail({ id: modelId });
        wrap(model).assign(data);
        await this.repo.getEntityManager().flush();
        return model;
    }

    async findAllModels() {
        return await this.repo.findAll();
    }

    async findModelByIdWithSpecificFields(modelId: string) {
        return await this.repo.findOneOrFail({ id: modelId }, { fields: ['title', 'description', 'type', 'version'] });
    }

    async findModelById(modelId: string) {
        return await this.repo.findOneOrFail({ id: modelId });
    }

    async deleteModel(id: string) {
        const model = await this.repo.findOneOrFail({ id });
        return await this.repo.getEntityManager().removeAndFlush(model);
    }

    async downloadModel(modelId: string, res: Response) {
        const model = await this.findModelById(modelId);

        // Generate binary data for the file (replace this with your binary data generation logic)
        const binaryData = this.createBinaryStream(model.data);

        // Set response headers for file download
        res.setHeader('Content-Disposition', `attachment; filename=${model.filepath}`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Send the file to the client
        binaryData.pipe(res);
    }

    createBinaryStream(binaryData: Buffer): Readable {
        // Create a readable stream from binary data
        const readable = new Readable();

        // Push the binary data into the stream
        readable.push(binaryData);

        // Signal the end of the stream
        readable.push(null);

        return readable;
    }
}
