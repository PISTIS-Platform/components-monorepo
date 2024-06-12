import { Readable } from 'stream';

import { ModelsRepositoryService } from './models-repository.service';

describe('ModelsRepositoryService', () => {
    let service: ModelsRepositoryService;
    let repo: any;

    const model = {
        id: 'ModelId123',
        size: 10,
        title: 'model123',
        description: 'model123',
        type: 'Metadata model' as any,
        version: 'v1.0',
        filepath: '',
        data: {
            buffer: [10, 20, 30, 40, 50],
            originalName: 'test name',
        },
    };

    const modelId = 'modelId123';

    beforeEach(async () => {
        repo = {
            findOneOrFail: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                flush: jest.fn(),
                persistAndFlush: jest.fn(),
                removeAndFlush: jest.fn(),
            }),
        };

        service = new ModelsRepositoryService(repo);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create a model', async () => {
        jest.spyOn(repo, 'create').mockReturnValue(model);
        jest.spyOn(repo.getEntityManager(), 'persistAndFlush').mockImplementation();

        const result = await service.createModel(model);

        expect(result).toEqual(model);
    });

    it('should update a model', async () => {
        jest.spyOn(repo, 'findOneOrFail').mockReturnValue(model);
        jest.spyOn(repo.getEntityManager(), 'persistAndFlush').mockImplementation();

        const result = await service.updateModel(modelId, model);
        expect(result).toEqual(model);
    });

    it('should return all models', async () => {
        const models = [{ id: 'model123' }, { id: 'model456' }];
        jest.spyOn(repo, 'findAll').mockResolvedValue(models as any);

        const result = await service.findAllModels();
        expect(result).toEqual(models);
    });

    it('should return a model by ID', async () => {
        const model = { id: modelId };
        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(model as any);

        const result = await service.findModelById(modelId);
        expect(result).toEqual(model);
    });

    it('should return a model by ID with specific fields', async () => {
        jest.spyOn(repo, 'findOneOrFail').mockResolvedValue(model as any);

        const result = await service.findModelByIdWithSpecificFields(modelId);
        expect(result).toEqual(model);
    });

    it('should delete a model by ID', async () => {
        jest.spyOn(repo, 'findOneOrFail').mockImplementation();
        jest.spyOn(repo.getEntityManager(), 'removeAndFlush').mockImplementation();

        const result = await service.deleteModel(modelId);
        expect(result).toBeUndefined();
    });

    it('should download a model', async () => {
        jest.spyOn(service, 'findModelById').mockResolvedValue(model as any);

        const res = {
            setHeader: jest.fn(),
        } as any;

        const binaryData = new Readable();
        binaryData.push(model.data);
        binaryData.push(null);

        jest.spyOn(service, 'createBinaryStream').mockReturnValue(binaryData);
        jest.spyOn(binaryData, 'pipe').mockImplementation();
        await service.downloadModel(modelId, res);

        expect(service.findModelById).toHaveBeenCalledWith(modelId);
        expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', `attachment; filename=${model.filepath}`);
        expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
        expect(binaryData.pipe).toHaveBeenCalledWith(res);
    });
});
