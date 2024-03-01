import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateFactoryDTO {
    @IsNotEmpty()
    @IsString()
    organizationName!: string;

    @IsNotEmpty()
    @IsString()
    organizationId!: string;

    @IsNotEmpty()
    @IsString()
    ip!: string;

    @IsNotEmpty()
    @IsString()
    country!: string;

    @IsNotEmpty()
    @IsBoolean()
    @IsOptional()
    isAccepted!: boolean;

    @IsNotEmpty()
    @IsString()
    status!: string;

    @IsNotEmpty()
    @IsBoolean()
    @IsOptional()
    isActive!: boolean;
}
