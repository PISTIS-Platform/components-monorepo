import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MikroOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class ComponentHealthController {
    constructor(private health: HealthCheckService, private mikroOrm: MikroOrmHealthIndicator) {}

    @Get()
    @HealthCheck()
    async check() {
        return this.health.check([
            () => ({ intentionAnalytics: { status: 'up', message: 'ready to serve' } }),
            () => this.mikroOrm.pingCheck('database'),
        ]);
    }
}
