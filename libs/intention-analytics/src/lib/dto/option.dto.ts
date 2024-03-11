import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class OptionDto {
    @IsNotEmpty()
    @IsString()
    @MaxLength(255, { message: 'Option text is too long, it should not be longer than 255 characters' })
    @ApiProperty()
    text!: string;

    @IsOptional()
    @IsString()
    @MaxLength(255, { message: 'Description is too long, it should not be longer than 255 characters' })
    @ApiProperty()
    description?: string;
}
