import { OmitType } from '@nestjs/swagger';

import { CreateFactoryDTO } from './create-factory.dto';

export class UpdateFactoryDTO extends OmitType(CreateFactoryDTO, [
    'organizationName',
    'organizationId',
    'factoryPrefix',
    'ip',
    'country',
] as const) {}
