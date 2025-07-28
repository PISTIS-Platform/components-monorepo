import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, MikroOrmHealthIndicator } from '@nestjs/terminus';
import { Public } from 'nest-keycloak-connect';

@Controller('health')
export class ComponentHealthController {
    constructor(private health: HealthCheckService, private mikroOrm: MikroOrmHealthIndicator) {}

    @Get()
    @Public()
    @HealthCheck()
    async check() {
        return this.health.check([
            () => ({ intentionAnalytics: { status: 'up', message: 'ready to serve' } }),
            () => this.mikroOrm.pingCheck('database'),
        ]);
    }
}
