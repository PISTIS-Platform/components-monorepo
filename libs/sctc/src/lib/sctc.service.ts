import { Injectable, Logger } from '@nestjs/common';
import { MetadataRepositoryService } from '@pistis/metadata-repository';

import { DownloadFrequencyType, MonetizationMethod } from './constants';
import { ContractComposerDto } from './dto/contract-composer.dto';

@Injectable()
export class SCTCService {
    private readonly logger = new Logger(SCTCService.name);
    constructor(private readonly metadataService: MetadataRepositoryService) {}

    getFrequencyConstraint = (data: ContractComposerDto) => {
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

    async composeContract(data: ContractComposerDto) {
        //permissions array
        const permissionsArray = [];

        if (data.limitFrequency && data.limitNumber) {
            permissionsArray.push({
                target: `${data.assetId}`,
                action: 'download',
                constraint: this.getFrequencyConstraint(data),
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

        //prepare final ODRL object
        const odrl = {
            '@context': 'http://www.w3.org/ns/odrl.jsonld',
            '@type': 'Set',
            uid: `https://pistis-market.eu/srv/odrl/${data.assetId}`,
            permission: permissionsArray,
        };

        //monetization plan details based on type
        let monetisationPlanDetails = {};

        if (data.monetisationMethod === MonetizationMethod.One_Off) {
            monetisationPlanDetails = {
                type: MonetizationMethod.One_Off,
                price: data.price,
                assetId: data.assetId,
                limit: {
                    times: data.limitNumber,
                    frequency: data.limitFrequency,
                    until: data?.downloadUntil || '',
                },
            };
        } else if (data.monetisationMethod === MonetizationMethod.Subscription) {
            monetisationPlanDetails = {
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
        }

        // return final payload
        return {
            odrl,
            accessPolicies: {}, //TODO:: fill this once they are available
            monetisationPlanDetails,
            terms: data.terms,
        };
    }

    async createODRLContract(assetId: string) {
        const odrl = {
            '@context': ['http://www.w3.org/ns/odrl.jsonld', 'https://pistis.eu/odrl/context.jsonld'],
        };
        const permissions = [];
        const prohibition = [];

        const data = await this.metadataService.retrieveMetadata(assetId);
        //TODO: Find the fields that we need in metadata

        //TODO: Change validations here when we have the exact field from metadata
        if (data === 'exclusive') {
            permissions.push({
                target: `http://example.com/dataset/${assetId}`,
                action: 'use',
                assignee: 'data.org:data.BuyerA',
                constraint: [
                    {
                        leftOperand: 'exclusive',
                        operator: 'eq',
                        rightOperand: true,
                    },
                ],
            });
        } else if (data === 'duration') {
            permissions.push({
                target: `http://example.com/dataset/${assetId}`,
                action: 'use',
                assignee: 'data.org:data.BuyerA',
                constraint: [
                    {
                        leftOperand: 'dateTime',
                        operator: 'geq',
                        rightOperand: '2023-01-01T00:00:00Z', //TODO: change with the actual date from metadata
                    },
                    {
                        leftOperand: 'dateTime',
                        operator: 'leq',
                        rightOperand: '2024-01-01T00:00:00Z', //TODO: change with the actual date from metadata
                    },
                ],
            });
        } else if (data === 'No resale or redistribution') {
            permissions.push({
                target: `http://example.com/dataset/${assetId}`,
                action: 'use',
                assignee: 'data.org:data.BuyerA',
            });
            //FIXME: Change the action names based on the actual requirements
            /*
            {
                    "target":`http://example.com/dataset/${assetId}`,
                    "action":"distribute"
                 }
            */
            prohibition.push({
                target: `http://example.com/dataset/${assetId}`,
                action: 'resell',
            });
        }
        //FIXME: return or send to another service to be discussed with the team that need composer

        return {
            odrl,
            permissions,
            prohibition,
        };
    }
}
