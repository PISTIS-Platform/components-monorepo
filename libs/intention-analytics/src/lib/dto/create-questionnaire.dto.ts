import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import { QuestionDto } from './question.dto';

export class CreateQuestionnaireDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(50, { message: 'Text is too long, it should not be longer than 50 characters' })
    @ApiProperty()
    title!: string;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Text is too long, it should not be longer than 255 characters' })
    @ApiProperty()
    description?: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    creatorId!: string;

    @IsNotEmpty()
    @IsBoolean()
    @ApiProperty({ type: Boolean })
    isForVerifiedBuyers!: boolean;

    @IsNotEmpty()
    @IsBoolean()
    @ApiProperty({ type: Boolean })
    isActive!: boolean;

    @IsNotEmpty()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuestionDto)
    @ApiProperty({ type: [QuestionDto] })
    questions!: QuestionDto[];
}
