import { Module } from '@nestjs/common';

import { KubernetesService } from './kubernetes.service';

@Module({
    controllers: [],
    providers: [KubernetesService],
    exports: [],
})
export class KubernetesModule {}
