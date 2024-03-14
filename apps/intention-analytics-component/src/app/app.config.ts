import { registerAs } from '@nestjs/config';
import { IAppConfig } from '@pistis/shared';

export const AppConfig = registerAs(
    'app',
    (): IAppConfig => ({
        name: process.env.APP_NAME,
        port: +process.env.APP_PORT,
        database: {
            host: process.env.DB_HOST,
            port: +process.env.DB_PORT,
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            dbName: process.env.DB_NAME,
        },
    }),
);
