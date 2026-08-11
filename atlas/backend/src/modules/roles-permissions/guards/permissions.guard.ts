import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { IJwtPayload } from '@modules/authentication/interfaces';
import { PermissionResolverService } from '../permission-resolver.service';
import { REQUIRE_PERMISSION_KEY, IRequirePermissionMetadata } from '../decorators/require-permission.decorator';
import { PermissionDeniedException } from '../exceptions/roles-permissions.exceptions';

/**
 * PermissionsGuard — the single, centralized enforcement point for granular
 * permission checks. Opt-in per route via `@RequirePermission(...)`; routes
 * without that decorator are unaffected, so existing access behavior across
 * the codebase is fully preserved. Runs after the global `JwtAuthGuard`
 * (which already populated `request.user` from the JWT), so this only adds
 * a second, finer-grained check on top — it never replaces it.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionResolver: PermissionResolverService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<IRequirePermissionMetadata | undefined>(
      REQUIRE_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: IJwtPayload }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const scopeId = metadata.scopeIdParam ? request.params?.[metadata.scopeIdParam] : undefined;

    const allowed = await this.permissionResolver.hasPermission({
      userId: user.sub,
      workspaceId: user.workspaceId,
      legacyRole: user.role,
      module: metadata.module,
      resource: metadata.resource,
      action: metadata.action,
      scopeType: metadata.scopeType,
      scopeId,
    });

    if (!allowed) {
      throw new PermissionDeniedException(metadata.action, metadata.resource);
    }
    return true;
  }
}
