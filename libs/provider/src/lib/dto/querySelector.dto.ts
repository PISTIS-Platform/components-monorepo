import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class QuerySelectorDTO {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    cloudAssetId!: string;

    @IsNotEmpty()
    @ApiProperty()
    params!: Record<string, any>;
}
