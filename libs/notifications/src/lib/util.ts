import { UnauthorizedException } from '@nestjs/common';
import { verify } from 'jsonwebtoken';
import jwks from 'jwks-rsa';

export const createJwksClient = (keycloakInfo: { url: string; realm: string }): jwks.JwksClient => {
    return jwks({
        jwksUri: `${keycloakInfo.url}/auth/realms/${keycloakInfo.realm}/protocol/openid-connect/certs`,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        cacheMaxAge: 600_000,
    });
};

export const validateToken = async (jwksClient: jwks.JwksClient, headers: Record<string, any>) => {
    const jwt = headers?.['authorization']?.split('Bearer ')?.[1] || null;

    //Check that jwt is not empty
    if (!jwt) {
        console.log('Empty JWT');
        throw new UnauthorizedException();
    }

    try {
        // Extract the key id (kid) from the header of the token
        const { kid } = JSON.parse(Buffer.from(jwt.split('.')[0], 'base64').toString());

        // Retrieve the signing key from the issuer
        const key = await jwksClient.getSigningKey(kid);

        // Get the public key
        const publicKey = key.getPublicKey();

        // Verify token, and return payload
        const payload = verify(jwt, publicKey);

        return payload;
    } catch (err: any) {
        // If anything went wrong, log the reason
        console.log(err.message);
        throw new UnauthorizedException('Invalid token');
    }
};
