import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ORGANISATION_MEMBER } from '@pistis/shared';
import { Roles } from 'nest-keycloak-connect';

import { ContractComposerDto } from './dto/contract-composer.dto';
import { SCTCService } from './sctc.service';

@Controller('sctc')
@ApiTags('sctc')
@ApiBearerAuth()
export class SCTCController {
    constructor(private readonly service: SCTCService) {}

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

    @Post('/create/:assetId')
    @ApiOkResponse({
        description: 'Compose Contract Info',
        schema: {
            example: {
                '@context': ['http://www.w3.org/ns/odrl.jsonld', 'https://pistis.eu/odrl/context.jsonld'],
                permission: [
                    {
                        target: 'http://example.com/dataset/123',
                        action: 'use',
                        assignee: 'org:BuyerA',
                        constraint: [
                            {
                                leftOperand: 'dateTime',
                                operator: 'geq',
                                rightOperand: '2023-01-01T00:00:00Z',
                            },
                            {
                                leftOperand: 'dateTime',
                                operator: 'leq',
                                rightOperand: '2024-01-01T00:00:00Z',
                            },
                        ],
                    },
                ],
            },
        },
    })
    @Roles({ roles: [ORGANISATION_MEMBER] })
    @ApiBody({ type: ContractComposerDto })
    @ApiUnauthorizedResponse()
    async createODRLContract(@Param('assetId') assetId: string) {
        return this.service.createODRLContract(assetId);
    }
}
