import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MikroOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class ComponentHealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private mikroOrm: MikroOrmHealthIndicator,
    ) {}

    @Get()
    @HealthCheck()
    async check() {
        return this.health.check([() => ({ appReadiness: { status: 'up', message: 'ready to serve' } })]);
    }

    @Get('/database')
    @HealthCheck()
    async checkDatabase() {
        return await this.health.check([() => this.mikroOrm.pingCheck('database')]);
    }
}
