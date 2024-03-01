import { OmitType } from '@nestjs/swagger';

import { CreateFactoryDTO } from './create-factory.dto';

export class UpdateFactoryDTO extends OmitType(CreateFactoryDTO, [
    'organizationName',
    'organizationId',
    'ip',
    'country',
] as const) {}
