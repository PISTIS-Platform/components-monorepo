import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

@Controller('health')
export class ComponentHealthController {
    constructor(private health: HealthCheckService) {}

    @Get()
    @HealthCheck()
    async check() {
        return this.health.check([() => ({ sctcComponent: { status: 'up', message: 'ready to serve' } })]);
    }
}
