// libs/shared/health/src/lib/mikro-orm.health.ts
import { MikroORM } from '@mikro-orm/core'; // Adjust path based on your MikroORM setup
import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class MikroOrmHealthIndicator extends HealthIndicator {
    constructor(private readonly orm: MikroORM) {
        super();
    }

    /**
     * Checks the health of the MikroORM database connection.
     * It tries to execute a simple query to ensure the connection is active.
     * @param key A unique key for this health check result (e.g., 'database' or 'my-api-db').
     */
    async isHealthy(key: string): Promise<HealthIndicatorResult> {
        try {
            // MikroORM's `isConnected()` only checks the internal state.
            // A better check is to execute a simple query.
            // For PostgreSQL: SELECT 1
            // For MySQL: SELECT 1
            // For MongoDB: db.adminCommand({ ping: 1 }) or a simple find operation
            await this.orm.em.getConnection().execute('SELECT 1');

            // If the query succeeds, the database is considered healthy.
            return this.getStatus(key, true);
        } catch (e) {
            // If an error occurs, the database is unhealthy.
            // Log the error for debugging purposes if needed.
            console.error(`MikroORM DB Health Check Failed for ${key}:`, e);
            throw new HealthCheckError(
                'MikroORM database connection failed',
                this.getStatus(key, false, { message: e }),
            );
        }
    }
}
