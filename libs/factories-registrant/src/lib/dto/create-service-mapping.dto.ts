import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateServiceMappingDTO {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    serviceName!: string;

    @IsNotEmpty()
    @IsString()
    @Matches(/^[a-zA-Z0-9-/]+$/)
    @ApiProperty()
    serviceUrl!: string;
}
