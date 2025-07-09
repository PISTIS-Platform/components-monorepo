import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiNotFoundResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { CreateInvestmentPlanDTO } from './create-investment-plan.dto';
import { InvestmentPlannerService } from './investment-planner.service';

@Controller('investment-planner')
@ApiTags('investment-planner')
// @ApiBearerAuth()
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
        schema: { example: { asset_uuid: 'ae755a90-b7bc-4c28-bfc8-7a4fb247328b', message: 'Table created' } },
    })
    async retrieveInvestmentPlan(@Param('assetId') assetId: string) {
        return await this.investmentPlannerService.retrieveInvestmentPlan(assetId);
    }

    @Post()
    @ApiOkResponse({
        description: '',
        schema: { example: { asset_uuid: 'ae755a90-b7bc-4c28-bfc8-7a4fb247328b', message: 'Table created' } },
    })
    async createInvestmentPlan(
        // @AuthenticatedUser(new ParseUserInfoPipe()) user: UserInfo,
        @Body() data: CreateInvestmentPlanDTO,
    ) {
        return await this.investmentPlannerService.createInvestmentPlan(data, 'user' as any);
    }
}
