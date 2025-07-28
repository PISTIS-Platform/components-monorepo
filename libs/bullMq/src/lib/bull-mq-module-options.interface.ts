export interface BullMqModuleOptions {
    notificationsUrl: string;
    identityAccessManagementUrl: string;
    clientId: string;
    secret: string;
    authServerUrl: string;
    bullOptions: any;
    connection: {
        host: string;
        port: number;
        username?: string;
        password?: string;
        db?: number;
    };
    defaultJobOptions?: {
        attempts?: number;
        backoff?: {
            type: 'fixed' | 'exponential';
            delay?: number;
        };
        removeOnComplete?: boolean;
        removeOnFail?: boolean;
    };
}
