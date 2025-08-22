import { registerAs } from '@nestjs/config';

export const AppConfig = registerAs('app', () => ({
    name: process.env.APP_NAME,
    port: +process.env.APP_PORT,
    isDevelopment: process.env.NODE_ENV !== 'production',
    swaggerBaseUrl: process.env.SWAGGER_BASE_URL ?? '/',
}));
