import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ParseUserInfoPipe, UserInfo } from '@pistis/shared';
import { AuthenticatedUser } from 'nest-keycloak-connect';

import { CreateInvestmentPlanDTO } from './create-investment-plan.dto';
import { InvestmentPlannerService } from './investment-planner.service';

@Controller('investment-planner')
@ApiTags('investment-planner')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
    description: 'Unauthorized.',
    schema: {
        example: {
            message: 'Unauthorized',
            status: 401,
        },
    },
})
@ApiNotFoundResponse({
    description: 'NotFound.',
    schema: {
        example: {
            message: 'NotFound',
            status: 404,
        },
    },
})
export class InvestmentPlannerController {
    constructor(private readonly investmentPlannerService: InvestmentPlannerService) {}

    @Get('/retrieve/:assetId')
    @ApiOkResponse({
        description: '',
        schema: {
            example: {
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
            },
        },
    })
    async retrieveInvestmentPlan(@Param('assetId') assetId: string) {
        return await this.investmentPlannerService.retrieveInvestmentPlan(assetId);
    }

    @Post()
    @ApiOkResponse({
        description: '',
        schema: {
            example: {
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
            },
        },
    })
    async createInvestmentPlan(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Body() data: CreateInvestmentPlanDTO,
    ) {
        return await this.investmentPlannerService.createInvestmentPlan(data, user);
    }

    @Put('/update/:planId')
    @ApiOkResponse({
        description: '',
        schema: { example: { asset_uuid: 'ae755a90-b7bc-4c28-bfc8-7a4fb247328b', message: 'Table created' } },
    })
    async updateInvestmentPlan(
        @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Param('planId') planId: string,
        @Body() data: any,
    ) {
        return await this.investmentPlannerService.updateInvestmentPlan(planId, data, user);
    }
}
