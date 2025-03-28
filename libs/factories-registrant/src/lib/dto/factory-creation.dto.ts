import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class FactoryCreationDTO {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    organizationName!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    type!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    domain!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    country!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    size!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    adminFirstName!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    adminLastName!: string;

    @IsNotEmpty()
    @IsString()
    @IsEmail()
    @ApiProperty()
    adminEmail!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    factoryPrefix!: string;

    @IsNotEmpty()
    @IsBoolean()
    @IsOptional()
    @ApiProperty()
    isAccepted!: boolean;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    @IsOptional()
    ip!: string;
}
