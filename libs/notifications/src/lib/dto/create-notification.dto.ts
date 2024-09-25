import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

import { NotificationType } from '../constants';

export class CreateNotificationDto {
    @IsNotEmpty()
    @IsUUID(4)
    @ApiProperty()
    userId!: string;

    @IsOptional()
    @IsUUID(4)
    @ApiProperty()
    organizationId!: string;

    @IsNotEmpty()
    @IsString()
    @IsEnum(NotificationType)
    @ApiProperty({ enum: NotificationType })
    type!: NotificationType;

    @IsNotEmpty()
    @IsString()
    @ApiProperty()
    message!: string;

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ type: Boolean })
    isHidden = false;
}
