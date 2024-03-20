import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ResponseDto {
    @IsNotEmpty()
    @IsUUID(4)
    @ApiProperty()
    questionId?: string;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    questionTitle!: string;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Text is too long, it should not be longer than 255 characters' })
    @ApiProperty()
    text?: string;

    @IsOptional()
    @IsArray()
    @ApiProperty({ type: Array<string> })
    options?: string[];
}
