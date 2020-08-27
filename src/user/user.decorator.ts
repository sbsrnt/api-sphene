import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";

import { NETWORK_RESPONSE } from "../errors";

export const AuthUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    if(!request.user) {
      throw new UnauthorizedException(NETWORK_RESPONSE.ERRORS.GENERAL.TOKEN_INVALID)
    }

    return request.user;
  },
);
