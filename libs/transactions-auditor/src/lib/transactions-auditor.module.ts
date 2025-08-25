import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TransactionsAuditor } from './transactions-auditor.entity';

@Module({
    imports: [MikroOrmModule.forFeature([TransactionsAuditor])],
    controllers: [],
    providers: [],
    exports: [],
})
export class TransactionsAuditorModule {}
