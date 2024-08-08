import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ORGANISATION_MEMBER } from '@pistis/shared';
import { Roles } from 'nest-keycloak-connect';

import { ContractComposerDto } from './dto/contract-composer.dto';
import { SmartContractTemplateComposerService } from './smart-contract-template-composer.service';

@Controller('smart-contract-template-composer')
@ApiTags('smart-contract-template-composer')
@ApiBearerAuth()
export class SmartContractTemplateComposerController {
    constructor(private readonly service: SmartContractTemplateComposerService) {}

    @Post('/compose')
    @ApiOkResponse({
        description: 'Compose Contract Info',
        schema: {
            example: {
                odrl: {
                    '@context': 'http://www.w3.org/ns/odrl.jsonld',
                    '@type': 'Set',
                    uid: 'https://pistis-market.eu/srv/odrl/d4082fba-903a-446e-904b-b12b86766ce3',
                    permission: [
                        {
                            target: 'd4082fba-903a-446e-904b-b12b86766ce3',
                            action: 'download',
                            constraint: [
                                {
                                    leftOperand: 'frequencyPerDay',
                                    operator: 'lteq',
                                    rightOperand: 3,
                                },
                            ],
                        },
                        {
                            target: 'd4082fba-903a-446e-904b-b12b86766ce3',
                            action: 'download',
                            constraint: [
                                {
                                    leftOperand: 'dateTime',
                                    operator: 'lteq',
                                    rightOperand: {
                                        '@value': '2024-02-15T09:33:23.887Z',
                                        '@type': 'xsd:date',
                                    },
                                },
                            ],
                        },
                    ],
                },
                accessPolicies: {},
                monetisationPlanDetails: {
                    type: 'subscription',
                    price: 450,
                    assetId: 'd4082fba-903a-446e-904b-b12b86766ce3',
                    frequency: 'month',
                    limit: {
                        times: 3,
                        frequency: 'day',
                        until: '2024-02-15T09:33:23.887Z',
                    },
                },
                terms: 'test terms',
            },
        },
    })
    @Roles({ roles: [ORGANISATION_MEMBER] })
    @ApiBody({ type: ContractComposerDto })
    @ApiUnauthorizedResponse()
    async create(@Body() data: ContractComposerDto) {
        return this.service.composeContract(data);
    }
}
