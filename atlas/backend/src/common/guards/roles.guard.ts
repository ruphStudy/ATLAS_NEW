import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { IJwtPayload } from '@modules/authentication/interfaces';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * RolesGuard — least-privilege enforcement for `@Roles(...)`-decorated
 * routes. Runs after the global `JwtAuthGuard`, which already populates
 * `request.user`. Routes without `@Roles(...)` are unaffected. `OWNER`
 * always passes, matching the legacy super-role precedent already used by
 * `PermissionsGuard` in `roles-permissions`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: IJwtPayload }>();
    const role = request.user?.role;
    if (!role) {
      throw new UnauthorizedException('Authentication required');
    }

    if (role === 'OWNER' || requiredRoles.includes(role)) {
      return true;
    }

    throw new ForbiddenException(`Requires one of roles: ${requiredRoles.join(', ')}`);
  }
}
