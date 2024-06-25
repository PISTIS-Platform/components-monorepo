import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { ModelType } from '../constants';

export class CreateModelDTO {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    title!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    description!: string;

    @IsNotEmpty()
    @IsString()
    @IsEnum(ModelType)
    @ApiProperty()
    type!: ModelType;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    version!: string;

    @IsNotEmpty()
    @ApiProperty()
    data!: any;
}
