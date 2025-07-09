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
    remainingShares!: number;

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
