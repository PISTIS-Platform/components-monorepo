import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { HealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class ComponentHealthController {
    constructor(private health: HealthCheckService, private indicators: HealthIndicator[]) {}

    @Get()
    @HealthCheck()
    check() {
        return this.health.check(this.indicators.map((ind) => () => ind.isHealthy()));
    }
}
