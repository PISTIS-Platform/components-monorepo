import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ColumnDto {
    @IsString()
    @ApiProperty()
    name!: string;

    @IsString()
    @ApiProperty()
    dataType!: string;

    @ApiProperty()
    data_model!: any;
}

export class ConfigDataDto {
    @IsOptional()
    @ApiProperty({ type: ColumnDto })
    @ValidateNested({ each: true })
    @Type(() => ColumnDto)
    columns?: ColumnDto[];

    @IsOptional()
    @IsInt()
    @ApiProperty()
    offset?: number;

    @IsOptional()
    @IsInt()
    @ApiProperty()
    batchSize?: number;

    @IsOptional()
    @IsString()
    @ApiProperty()
    consumerPrefix?: string;

    @IsOptional()
    @IsString()
    @ApiProperty()
    providerPrefix?: string;

    @IsOptional()
    @ApiProperty()
    kafkaConfig?: {
        id: string;
        username: string;
        password: string;
        bootstrapServers: string;
    };
}
