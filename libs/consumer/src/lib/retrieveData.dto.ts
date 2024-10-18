import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';


export class RetrieveDataDTO {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    assetFactory!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    sellerId!: string;

}
