import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { Status } from '../enums';

export class CreateFactoryDTO {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    organizationName!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    organizationId!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    @IsOptional()
    ip!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
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
    @ApiProperty()
    isAccepted!: boolean;

    @IsNotEmpty()
    @IsBoolean()
    @IsOptional()
    @ApiProperty()
    isActive!: boolean;
}
