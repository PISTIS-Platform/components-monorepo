import { PartialType } from '@nestjs/swagger';

import { CreateServiceMappingDTO } from './create-service-mapping.dto';

export class UpdateServiceMappingDTO extends PartialType(CreateServiceMappingDTO) {}
