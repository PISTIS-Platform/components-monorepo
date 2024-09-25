import { CanActivate, ExecutionContext, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwks from 'jwks-rsa';
import { Observable } from 'rxjs';

import { createJwksClient, validateToken } from '../util';

@Injectable()
export class WsAuthGuard implements CanActivate, OnModuleInit {
    private jwksClient!: jwks.JwksClient;

    constructor(private readonly config: ConfigService) { }

    async onModuleInit() {
        this.jwksClient = createJwksClient({
            url: this.config.get('app.keycloak.url') || '',
            realm: this.config.get('app.keycloak.realm') || '',
        });
    }

    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        if (context.getType() !== 'ws') return false;

        //Extract token based on authorization headers
        const request = context.switchToWs().getClient().handshake;

        //Validate token
        request.user = validateToken(this.jwksClient, request.headers);
        return true;
    }
}
