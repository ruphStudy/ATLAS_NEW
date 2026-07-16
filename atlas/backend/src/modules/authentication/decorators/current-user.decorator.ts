import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { IJwtPayload } from '../interfaces';

/**
 * @CurrentUser()
 *
 * Extracts the authenticated user (or a specific field) from the request.
 *
 * Usage:
 *   @CurrentUser() payload: IJwtPayload          → full JWT payload
 *   @CurrentUser('sub') userId: string           → user ID only
 *   @CurrentUser('workspaceId') wsId: string     → workspace ID only
 */
export const CurrentUser = createParamDecorator(
  (field: keyof IJwtPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user: IJwtPayload }>();
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
