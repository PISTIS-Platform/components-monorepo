import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateInvestmentPlanDTO {
    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    cloudAssetId!: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    assetId!: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    title!: string;

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    description!: string;

    @IsNotEmpty()
    @ApiProperty()
    terms!: any;

    @IsNotEmpty()
    @ApiProperty()
    keywords!: string[];

    @IsNotEmpty()
    @ApiProperty()
    accessPolicy!: string[];

    @IsString()
    @IsNotEmpty()
    @ApiProperty()
    dueDate!: string;

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty()
    percentageOffer!: number;

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty()
    totalShares!: number;

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty()
    maxShares!: number;

    @IsNumber()
    @IsNotEmpty()
    @ApiProperty()
    price!: number;

    @IsBoolean()
    @IsNotEmpty()
    @ApiProperty()
    status!: boolean;
}
