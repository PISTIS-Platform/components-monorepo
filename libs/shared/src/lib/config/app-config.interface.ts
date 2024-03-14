export interface IAppConfig {
    name: string;
    port: number;
    database: {
        host: string;
        port: number;
        username?: string;
        password?: string;
        dbName: string;
    };
}
