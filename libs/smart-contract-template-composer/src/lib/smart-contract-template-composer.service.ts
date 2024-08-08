import { Injectable, Logger } from '@nestjs/common';

import { DownloadFrequencyType, MonetizationMethod } from './constants';
import { ContractComposerDto } from './dto/contract-composer.dto';

@Injectable()
export class SmartContractTemplateComposerService {
    private readonly logger = new Logger(SmartContractTemplateComposerService.name);

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
}
