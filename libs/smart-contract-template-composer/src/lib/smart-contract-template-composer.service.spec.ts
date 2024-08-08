import { DownloadFrequencyType, MonetizationMethod, SubscriptionFrequencyType } from './constants';
import { ContractComposerDto } from './dto/contract-composer.dto';
import { SmartContractTemplateComposerService } from './smart-contract-template-composer.service';

jest.mock('@pistis/shared', () => ({
    getHeaders: jest.fn(() => ({})),
}));

describe('SmartContractTemplateComposerService', () => {
    let service: SmartContractTemplateComposerService;

    beforeEach(async () => {
        service = new SmartContractTemplateComposerService();
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    const getFrequencyConstraint = (data: ContractComposerDto) => {
        const constraintArray = [];

        const frequencyTypesOperandMappings = {
            [DownloadFrequencyType.Day]: 'frequencyPerDay',
            [DownloadFrequencyType.Hour]: 'frequencyPerHour',
            [DownloadFrequencyType.Week]: 'frequencyPerWeek',
            [DownloadFrequencyType.Month]: 'frequencyPerMonth',
            [DownloadFrequencyType.Year]: 'frequencyPerYear',
        };

        constraintArray.push({
            leftOperand: frequencyTypesOperandMappings[data.limitFrequency],
            operator: 'lteq',
            rightOperand: data.limitNumber,
        });

        return constraintArray;
    };

    const getOdrlObject = (data: ContractComposerDto) => {
        //permissions array
        const permissionsArray = [];

        if (data.limitFrequency && data.limitNumber) {
            permissionsArray.push({
                target: `${data.assetId}`,
                action: 'download',
                constraint: getFrequencyConstraint(data),
            });
        }

        if (data.downloadUntil) {
            permissionsArray.push({
                target: `${data.assetId}`,
                action: 'download',
                constraint: [
                    {
                        leftOperand: 'dateTime',
                        operator: 'lteq',
                        rightOperand: { '@value': data.downloadUntil, '@type': 'xsd:date' },
                    },
                ],
            });
        }

        return {
            '@context': 'http://www.w3.org/ns/odrl.jsonld',
            '@type': 'Set',
            uid: `https://pistis-market.eu/srv/odrl/${data.assetId}`,
            permission: permissionsArray,
        };
    };

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should compose contract with download frequency and download number and one-off method', async () => {
        const data: ContractComposerDto = {
            assetId: '123',
            monetisationMethod: MonetizationMethod.One_Off,
            terms: 'test terms',
            organizationId: '567',
            price: 200,
            limitFrequency: DownloadFrequencyType.Day,
            limitNumber: 3,
        };

        const odrl = getOdrlObject(data);

        const monetisationPlanDetails = {
            type: MonetizationMethod.One_Off,
            price: data.price,
            assetId: data.assetId,
            limit: {
                times: data.limitNumber,
                frequency: data.limitFrequency,
                until: data?.downloadUntil || '',
            },
        };

        const finalObject = {
            odrl,
            monetisationPlanDetails,
            accessPolicies: {},
            terms: data.terms,
        };

        jest.spyOn(service, 'getFrequencyConstraint').mockReturnValue([
            {
                leftOperand: 'frequencyPerDay',
                operator: 'lteq',
                rightOperand: data.limitNumber,
            },
        ]);

        expect(await service.composeContract(data)).toEqual(finalObject);
        expect(service.getFrequencyConstraint).toHaveBeenCalledTimes(1);
    });

    it('should compose contract with download frequency and download number and max date and one-off method', async () => {
        const data: ContractComposerDto = {
            assetId: '123',
            organizationId: '567',
            monetisationMethod: MonetizationMethod.One_Off,
            terms: 'test terms',
            price: 200,
            limitFrequency: DownloadFrequencyType.Hour,
            limitNumber: 3,
            downloadUntil: '2025-01-01',
        };

        const odrl = getOdrlObject(data);

        const monetisationPlanDetails = {
            type: MonetizationMethod.One_Off,
            price: data.price,
            assetId: data.assetId,
            limit: {
                times: data.limitNumber,
                frequency: data.limitFrequency,
                until: data?.downloadUntil || '',
            },
        };

        const finalObject = {
            odrl,
            monetisationPlanDetails,
            accessPolicies: {},
            terms: data.terms,
        };

        jest.spyOn(service, 'getFrequencyConstraint').mockReturnValue([
            {
                leftOperand: 'frequencyPerHour',
                operator: 'lteq',
                rightOperand: data.limitNumber,
            },
        ]);

        expect(await service.composeContract(data)).toEqual(finalObject);
        expect(service.getFrequencyConstraint).toHaveBeenCalledTimes(1);
    });

    it('should compose contract with subscription as monetization method', async () => {
        const data: ContractComposerDto = {
            assetId: '123',
            organizationId: '567',
            monetisationMethod: MonetizationMethod.Subscription,
            terms: 'test terms',
            price: 200,
            limitFrequency: DownloadFrequencyType.Day,
            subscriptionFrequency: SubscriptionFrequencyType.Monthly,
            limitNumber: 3,
            downloadUntil: '2025-01-01',
        };

        const odrl = getOdrlObject(data);

        const monetisationPlanDetails = {
            type: MonetizationMethod.Subscription,
            price: data.price,
            assetId: data.assetId,
            frequency: data.subscriptionFrequency,
            limit: {
                times: data.limitNumber,
                frequency: data.limitFrequency,
                until: data?.downloadUntil || '',
            },
        };

        const finalObject = {
            odrl,
            monetisationPlanDetails,
            accessPolicies: {},
            terms: data.terms,
        };

        jest.spyOn(service, 'getFrequencyConstraint').mockReturnValue([
            {
                leftOperand: 'frequencyPerDay',
                operator: 'lteq',
                rightOperand: data.limitNumber,
            },
        ]);

        expect(await service.composeContract(data)).toEqual(finalObject);
        expect(service.getFrequencyConstraint).toHaveBeenCalledTimes(1);
    });
});
