import { CreateInvestmentPlanDTO } from './create-investment-plan.dto';
import { InvestmentPlannerController } from './investment-planner.controller';
import { UpdateInvestmentPlanDTO } from './update-investment-plan.dto';

describe('ConsumerController', () => {
    let controller: InvestmentPlannerController;
    let service: any;
    let investmentPlan: any;
    let authUser: any;
    let userInvestmentPlan: any;

    beforeEach(async () => {
        service = {
            retrieveInvestmentPlan: jest.fn(),
            createInvestmentPlan: jest.fn(),
            updateInvestmentPlan: jest.fn(),
        };
        controller = new InvestmentPlannerController(service);

        investmentPlan = {
            id: 'a4ce90e4-8c88-4510-9f39-04246c6cc555',
            cloudAssetId: 'c74d8d5f-9351-428d-9c86-b7356526bf32',
            assetId: '1818ed08-9087-43f1-b41c-13284d9a6db3',
            dueDate: '2025-07-23 21:00:00+00',
            percentageOffer: 49,
            totalShares: 1000,
            remainingShares: 990,
            maxShares: 10,
            price: 50,
            status: true,
            title: 'Develop Test 08/07/2025',
            description: 'Description for Develop Test 08/07/2025',
            terms: '"alsdkfalsdkjflsadkjflaksdjflakdsjflkasdjflkasdjflkasjdf"',
            sellerId: 'user.id',
            keywords: '{keyword1,keywors3}',
            accessPolicy: [
                {
                    id: '1',
                    sizes: [],
                    title: 'Default policy for asset publication',
                    types: [],
                    groups: [],
                    scopes: [],
                    default: true,
                    domains: [],
                    countries: [],
                    description: 'Everyone can Read/Trade this asset',
                },
            ],
        };

        userInvestmentPlan = {
            cloud_asset_id: 'c74d8d5f-9351-428d-9c86-b7356526bf32',
            user_id: 'user.id',
            shares: 10,
            investment_plan_id: 'a4ce90e4-8c88-4510-9f39-04246c6cc555',
        };

        authUser = {
            id: '1',
            organizationId: '1234',
        };
    });

    afterAll(() => {
        jest.resetAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should retrieve an investment plan with correct parameters', async () => {
        jest.spyOn(service, 'retrieveInvestmentPlan').mockResolvedValue(investmentPlan);
        expect(await controller.retrieveInvestmentPlan('1818ed08-9087-43f1-b41c-13284d9a6db3')).toBe(investmentPlan);
    });

    it('should create an investment plan with correct parameters', async () => {
        const investmentPlanData: CreateInvestmentPlanDTO = {
            cloudAssetId: 'c74d8d5f-9351-428d-9c86-b7356526bf32',
            assetId: '1818ed08-9087-43f1-b41c-13284d9a6db3',
            dueDate: '2025-07-23 21:00:00+00',
            percentageOffer: 49,
            totalShares: 1000,
            maxShares: 10,
            price: 50,
            status: true,
            title: 'Develop Test 08/07/2025',
            description: 'Description for Develop Test 08/07/2025',
            terms: '"alsdkfalsdkjflsadkjflaksdjflakdsjflkasdjflkasdjflkasjdf"',
            keywords: ['keyword1', 'keywors3'],
            accessPolicy: [
                '{"id": "1", "sizes": [], "title": "Default policy for asset publication", "types": [], "groups": [], "scopes": [], "default": true, "domains": [], "countries": [], "description": "Everyone can Read/Trade this asset"}',
            ],
        };
        jest.spyOn(service, 'createInvestmentPlan').mockResolvedValue(investmentPlanData);
        expect(await controller.createInvestmentPlan(authUser, investmentPlanData)).toBe(investmentPlan);
    });

    it('should retrieve an investment plan with correct parameters', async () => {
        const investmentPlanData: UpdateInvestmentPlanDTO = {
            cloudAssetId: 'c74d8d5f-9351-428d-9c86-b7356526bf32',
            assetId: '1818ed08-9087-43f1-b41c-13284d9a6db3',
            dueDate: '2025-07-23 21:00:00+00',
            percentageOffer: 49,
            totalShares: 990,
            maxShares: 10,
            price: 50,
            status: true,
            title: 'Develop Test 08/07/2025',
            description: 'Description for Develop Test 08/07/2025',
            terms: '"alsdkfalsdkjflsadkjflaksdjflakdsjflkasdjflkasdjflkasjdf"',
            keywords: ['keyword1', 'keywors3'],
            accessPolicy: [
                '{"id": "1", "sizes": [], "title": "Default policy for asset publication", "types": [], "groups": [], "scopes": [], "default": true, "domains": [], "countries": [], "description": "Everyone can Read/Trade this asset"}',
            ],
        };
        jest.spyOn(service, 'updateInvestmentPlan').mockResolvedValue(userInvestmentPlan);
        expect(
            await controller.updateInvestmentPlan(authUser, 'a4ce90e4-8c88-4510-9f39-04246c6cc555', investmentPlanData),
        ).toBe(userInvestmentPlan);
    });
});
