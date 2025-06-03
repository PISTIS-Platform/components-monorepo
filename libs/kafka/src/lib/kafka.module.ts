import { Module } from '@nestjs/common';

import { KafkaService } from './kafka.service';

@Module({
    controllers: [],
    providers: [KafkaService],
    exports: [],
})
export class KafkaModule {}
