import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString, ValidateNested } from 'class-validator';

import { ResponseDto } from './response.dto';

export class CreateAnswerDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    userId!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    assetId!: string;

    @IsNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ResponseDto)
    @ApiProperty({ type: ResponseDto })
    responses!: ResponseDto[];
}
