import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { KafkaService } from './kafka.service';

@Module({
    imports: [HttpModule],
    controllers: [],
    providers: [KafkaService],
    exports: [KafkaService],
})
export class KafkaModule {}
