import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const AuthToken = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
    return ctx.getArgByIndex(0)?.accessTokenJWT;
});
