import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TransactionsAuditorController } from './transactions-auditor.controller';
import { TransactionsAuditor } from './transactions-auditor.entity';
import { TransactionsAuditorService } from './transactions-auditor.service';

@Module({
    imports: [MikroOrmModule.forFeature([TransactionsAuditor])],
    controllers: [TransactionsAuditorController],
    providers: [TransactionsAuditorService],
    exports: [],
})
export class TransactionsAuditorModule {}
