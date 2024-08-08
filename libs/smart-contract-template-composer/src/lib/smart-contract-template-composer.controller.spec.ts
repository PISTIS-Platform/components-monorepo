import { DownloadFrequencyType, MonetizationMethod } from './constants';
import { ContractComposerDto } from './dto/contract-composer.dto';
import { SmartContractTemplateComposerController } from './smart-contract-template-composer.controller';

describe('SmartContractTemplateComposerController', () => {
    let controller: SmartContractTemplateComposerController;
    let service: any;

    beforeEach(async () => {
        service = {
            composeContract: () => jest.fn(),
        };

        controller = new SmartContractTemplateComposerController(service);
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should return composed contract', async () => {
        const composedObject = { info: 'test' };
        const data: ContractComposerDto = {
            assetId: '123',
            organizationId: '567',
            monetisationMethod: MonetizationMethod.One_Off,
            terms: 'test terms',
            price: 200,
            limitFrequency: DownloadFrequencyType.Day,
            limitNumber: 3,
        };

        jest.spyOn(service, 'composeContract').mockResolvedValue(composedObject);
        expect(await controller.create(data)).toBe(composedObject);

        expect(service.composeContract).toHaveBeenCalledWith(data);
    });
});
