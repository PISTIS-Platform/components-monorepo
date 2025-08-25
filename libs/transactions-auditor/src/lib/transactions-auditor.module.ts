import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { ComponentHealthController } from './component-health.controller';
import { TransactionsAuditorController } from './transactions-auditor.controller';
import { TransactionsAuditor } from './transactions-auditor.entity';
import { TransactionsAuditorService } from './transactions-auditor.service';

@Module({
    imports: [MikroOrmModule.forFeature([TransactionsAuditor]), TerminusModule],
    controllers: [TransactionsAuditorController, ComponentHealthController],
    providers: [TransactionsAuditorService],
    exports: [],
})
export class TransactionsAuditorModule {}
