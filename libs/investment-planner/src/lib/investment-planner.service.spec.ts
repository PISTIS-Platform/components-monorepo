import { InvestmentPlannerService } from './investment-planner.service';

describe('InvestmentPlannerService', () => {
    let service: InvestmentPlannerService;
    let httpService: any;
    let investmentRepo: any;
    let userInvestmentRepo: any;
    let options: any;
    let investmentPlan: any;
    let authUser: any;
    let userInvestmentPlan: any;

    beforeEach(async () => {
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

        httpService = {
            post: jest.fn(),
        };
        investmentRepo = {
            findOneOrFail: jest.fn(),
            create: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                persistAndFlush: jest.fn(),
            }),
        };
        userInvestmentRepo = {
            findOneOrFail: jest.fn(),
            create: jest.fn(),
            getEntityManager: jest.fn().mockReturnValue({
                persistAndFlush: jest.fn(),
            }),
        };

        options = {
            clientId: '',
            secret: '',
        };
        service = new InvestmentPlannerService(httpService, investmentRepo, userInvestmentRepo, options);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should retrieve investment plan', async () => {
        jest.spyOn(investmentRepo, 'findOneOrFail').mockResolvedValue(investmentPlan);
        expect(await service.retrieveInvestmentPlan('1818ed08-9087-43f1-b41c-13284d9a6db3')).toBe(investmentPlan);
    });

    it('should create investment plan', async () => {
        const investmentPlanData = {
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
            keywords: ['keyword1', 'keywors3'],
            accessPolicy: [
                '{"id": "1", "sizes": [], "title": "Default policy for asset publication", "types": [], "groups": [], "scopes": [], "default": true, "domains": [], "countries": [], "description": "Everyone can Read/Trade this asset"}',
            ],
        };

        jest.spyOn(investmentRepo, 'create').mockReturnValue({ investmentPlanData });
        jest.spyOn(investmentRepo.getEntityManager(), 'persistAndFlush').mockImplementation();
        expect(await service.createInvestmentPlan(investmentPlanData, authUser)).toEqual(investmentPlanData);
        expect(investmentRepo.create).toHaveBeenCalledTimes(1);
    });
});
