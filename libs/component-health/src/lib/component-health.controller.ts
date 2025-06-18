import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MikroOrmHealthIndicator } from '@nestjs/terminus';

@Controller('health')
export class ComponentHealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private typeOrm: MikroOrmHealthIndicator,
    ) {}

    @Get()
    @HealthCheck()
    async check() {
        // const healthChecks = [
        //     // 1. Basic Component Liveness Check (always included)
        //     () =>
        //         Promise.resolve({
        //             [`${componentName}-liveness`]: { status: 'up', message: `${componentName} process is alive` },
        //         }),
        // ];

        // return this.health.check(healthChecks as any);
        return this.health.check([
            // Start with the basic app readiness check
            () => Promise.resolve({ appReadiness: { status: 'up', message: 'ready to serve' } }),
            // --- Add common readiness checks here for all apps that use this module ---
            // Example if all apps connect to a common external service:
            // () => this.http.pingCheck('common-service', 'http://common-service-url/health'),
        ]);
    }
}
