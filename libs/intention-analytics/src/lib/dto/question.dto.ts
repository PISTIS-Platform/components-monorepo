import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import { QuestionType } from '../constants';
import { OptionDto } from './option.dto';

export class QuestionDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(255, { message: 'Title is too long, it should not be longer than 255 characters' })
    @ApiProperty()
    title!: string;

    @IsNotEmpty()
    @IsEnum(QuestionType)
    @ApiProperty({ enum: QuestionType })
    type!: QuestionType;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Description is too long, it should not be longer than 255 characters' })
    @ApiProperty()
    description?: string;

    @IsNotEmpty()
    @IsBoolean()
    @ApiProperty({ type: Boolean })
    isRequired!: boolean;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => OptionDto)
    @ApiProperty({ type: OptionDto })
    options?: OptionDto[];
}
