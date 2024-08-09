import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';

import { DownloadFrequencyType, MonetizationMethod, SubscriptionFrequencyType } from '../constants';

export class ContractComposerDto {
    @IsNotEmpty()
    @IsUUID(4)
    @ApiProperty()
    assetId!: string;

    @IsNotEmpty()
    @IsUUID(4)
    @ApiProperty()
    organizationId!: string;

    @IsNotEmpty()
    @ApiProperty()
    terms?: string;

    @IsNotEmpty()
    @IsEnum(MonetizationMethod)
    @ApiProperty({ enum: MonetizationMethod })
    monetisationMethod!: MonetizationMethod;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    price!: number;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    limitNumber!: number;

    @IsNotEmpty()
    @IsEnum(DownloadFrequencyType)
    @ApiProperty({ enum: DownloadFrequencyType })
    limitFrequency!: DownloadFrequencyType;

    @IsOptional()
    @IsDateString()
    @ApiProperty()
    downloadUntil?: string;

    @IsOptional()
    @IsEnum(SubscriptionFrequencyType)
    @ApiProperty({ enum: SubscriptionFrequencyType })
    subscriptionFrequency?: SubscriptionFrequencyType;
}
