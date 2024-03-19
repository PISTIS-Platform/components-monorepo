import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ColumnDto {
    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    name!: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    dataType!: string;
}

export class PaginationDto {
    @IsOptional()
    @ApiProperty({ type: ColumnDto })
    @ValidateNested({ each: true })
    @Type(() => ColumnDto)
    columns?: ColumnDto[];

    @IsNotEmpty()
    @IsInt()
    @ApiProperty()
    offset!: number;

    @IsNotEmpty()
    @IsInt()
    @ApiProperty()
    batchSize!: number;
}
