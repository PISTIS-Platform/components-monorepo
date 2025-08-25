import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class TransactionAuditorDTO {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    transactionId!: string;

    @IsNumber()
    @ApiProperty()
    transactionFee?: number;

    @IsNotEmpty()
    @IsNumber()
    @ApiProperty()
    amount!: number;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    factoryBuyerId!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    factoryBuyerName!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    factorySellerId!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    factorySellerName!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    assetId!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    assetName!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    terms!: string;
}
