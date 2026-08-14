import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @Roles('ADMIN', 'OPERATOR')
 *
 * Opt-in, route-level least-privilege check — pair with
 * `@UseGuards(RolesGuard)`. Reads the legacy `role` claim already carried by
 * every JWT (see `IJwtPayload`); does not replace or duplicate the granular
 * `PermissionsGuard` / `@RequirePermission` system in `roles-permissions`.
 * `OWNER` always passes regardless of the roles listed here (see
 * `RolesGuard`), matching the "legacy OWNER/ADMIN always pass" precedent
 * already established by `PermissionsGuard`.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
