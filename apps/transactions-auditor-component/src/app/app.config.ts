import { registerAs } from '@nestjs/config';

export const AppConfig = registerAs('app', () => ({
    name: process.env.APP_NAME,
    port: +process.env.APP_PORT,
    isDevelopment: process.env.NODE_ENV !== 'production',
    swaggerBaseUrl: process.env.SWAGGER_BASE_URL ?? '/',
    database: {
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        dbName: process.env.DB_NAME,
    },
}));
