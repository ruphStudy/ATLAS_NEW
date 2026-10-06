import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * @WorkspaceId()
 *
 * Extracts the workspaceId from the JWT payload on `request.user`.
 * Requires JwtAuthGuard to be active (globally applied via APP_GUARD).
 *
 * Usage:
 *   findAll(@WorkspaceId() workspaceId: string) { ... }
 */
export const WorkspaceId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: { workspaceId?: string } }>();
    return request.user?.workspaceId ?? '';
  },
);

/**
 * @UserId()
 *
 * Extracts the user's UUID (sub) from the JWT payload.
 *
 * Usage:
 *   logout(@UserId() userId: string) { ... }
 */
export const UserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: { sub?: string } }>();
    return request.user?.sub ?? '';
  },
);

/**
 * @UserRole()
 *
 * Extracts the user's role string from the JWT payload.
 */
export const UserRole = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: { role?: string } }>();
    return request.user?.role ?? '';
  },
);
