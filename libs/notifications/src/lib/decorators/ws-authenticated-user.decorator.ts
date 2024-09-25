import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const WsAuthenticatedUser = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    return ctx.getArgByIndex(0).handshake.user;
});
