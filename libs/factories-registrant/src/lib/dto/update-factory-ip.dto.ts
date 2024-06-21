import { OmitType } from '@nestjs/swagger';

import { CreateFactoryDTO } from './create-factory.dto';

export class UpdateFactoryIpDTO extends OmitType(CreateFactoryDTO, [
    'organizationName',
    'organizationId',
    'factoryPrefix',
    'country',
    'status',
    'isAccepted',
    'isActive',
] as const) {}
