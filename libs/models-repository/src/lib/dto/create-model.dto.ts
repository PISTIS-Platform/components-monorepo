import { IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { ModelType } from '../constants';

export class CreateModelDTO {
    @IsNotEmpty()
    @IsString()
    title!: string;

    @IsNotEmpty()
    @IsString()
    description!: string;

    @IsNotEmpty()
    @IsString()
    @IsEnum(ModelType)
    type!: ModelType;

    @IsNotEmpty()
    @IsString()
    version!: string;

    @IsNotEmpty()
    data!: any;
}
