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
    factoryPrefix!: string;

    @IsNotEmpty()
    @IsString()
    country!: string;

    @IsNotEmpty()
    @IsBoolean()
    @IsOptional()
    isAccepted!: boolean;

    @IsNotEmpty()
    @IsBoolean()
    @IsOptional()
    isActive!: boolean;
}
