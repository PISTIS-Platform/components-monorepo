import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class StreamingDataDto {
    @IsString()
    @ApiProperty()
    title?: string;

    @IsString()
    @ApiProperty()
    description?: string;
}
