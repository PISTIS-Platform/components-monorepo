import { PartialType } from '@nestjs/swagger';

import { CreateInvestmentPlanDTO } from './create-investment-plan.dto';

export class UpdateInvestmentPlanDTO extends PartialType(CreateInvestmentPlanDTO) {}
