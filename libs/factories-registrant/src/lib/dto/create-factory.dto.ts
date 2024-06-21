import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { Status } from '../enums';

export class CreateFactoryDTO {
    @IsNotEmpty()
    @IsString()
    organizationName!: string;

    @IsNotEmpty()
    @IsString()
    organizationId!: string;

    @IsNotEmpty()
    @IsString()
    @IsOptional()
    ip!: string;

    @IsNotEmpty()
    @IsString()
    factoryPrefix!: string;

    @IsNotEmpty()
    @IsString()
    country!: string;

    @IsNotEmpty()
    @IsEnum(Status)
    status!: string;

    @IsNotEmpty()
    @IsBoolean()
    @IsOptional()
    isAccepted!: boolean;

    @IsNotEmpty()
    @IsBoolean()
    @IsOptional()
    isActive!: boolean;
}
