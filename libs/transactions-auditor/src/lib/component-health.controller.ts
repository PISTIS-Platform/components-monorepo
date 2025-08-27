import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { Public } from 'nest-keycloak-connect';

@Controller('health')
export class ComponentHealthController {
    constructor(private health: HealthCheckService) {}

    @Get()
    @Public()
    @HealthCheck()
    async check() {
        return this.health.check([
            () => ({ transactionsAuditorComponent: { status: 'up', message: 'ready to serve' } }),
        ]);
    }
}
