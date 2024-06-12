import { ModelsRepositoryController } from './models-repository.controller';

describe('ModelsRepositoryController', () => {
    let controller: ModelsRepositoryController;
    let service: any;

    const model = {
        id: 'ModelId123',
        size: 10,
        title: 'model123',
        description: 'model123',
        type: 'Metadata model' as any,
        version: 'v1.0',
        filepath: '',
        data: {
            buffer: [],
            originalName: 'test name',
        },
    };

    const modelId = 'model123';

    beforeEach(async () => {
        service = {
            createModel: jest.fn(),
            updateModel: jest.fn(),
            findAllModels: jest.fn(),
            downloadModel: jest.fn(),
            findModelByIdWithSpecificFields: jest.fn(),
            deleteModel: jest.fn(),
        };
        controller = new ModelsRepositoryController(service);
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should call create model', async () => {
        const modelFile = {
            id: 'ModelId123',
            size: 10,
            title: 'model123',
            description: 'model123',
            type: 'Metadata model' as any,
            version: 'v1.0',
            filepath: '',
            data: {
                buffer: [],
                originalName: 'test name',
            },
        };
        jest.spyOn(service, 'createModel').mockReturnValue(model);
        expect(await controller.createModel(modelFile)).toBe(model);
    });

    it('should update model', async () => {
        const updatedFile = {
            size: 12,
            title: 'model123',
            description: 'model123',
            type: 'Metadata model' as any,
            version: 'v1.1',
        };
        jest.spyOn(service, 'updateModel').mockReturnValue(model);

        expect(await controller.updateModel(modelId, updatedFile)).toBe(model);
    });

    it('should find all models', async () => {
        const models = [{ id: 'model123' }, { id: 'model456' }];
        jest.spyOn(service, 'findAllModels').mockResolvedValue(models);
        expect(await controller.findAllModels()).toBe(models);
    });

    it('should download a model', async () => {
        let res: any;
        jest.spyOn(service, 'downloadModel').mockReturnValue(model);

        expect(await controller.downloadModel(modelId, res)).toEqual(model);
    });

    it('should find models by id with specific fields ', async () => {
        jest.spyOn(service, 'findModelByIdWithSpecificFields').mockReturnValue(model);

        expect(await controller.findModelById(modelId)).toBe(model);
    });

    it('should delete model', async () => {
        jest.spyOn(service, 'deleteModel').mockImplementation();
        expect(await controller.deleteModel(modelId)).toBeUndefined();
    });
});
