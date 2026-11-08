import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Extract authenticated user from request object
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
