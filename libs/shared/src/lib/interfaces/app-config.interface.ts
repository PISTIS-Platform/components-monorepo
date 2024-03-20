import { IKeycloakConfig } from './keycloak.interface';

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
    keycloak: IKeycloakConfig;
}
