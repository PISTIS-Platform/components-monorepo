import { OmitType } from '@nestjs/swagger';

import { CreateModelDTO } from './create-model.dto';

export class UpdateModelDTO extends OmitType(CreateModelDTO, ['data'] as const) {}
