import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { UsersRepository } from '@modules/users/users.repository';
import { PlatformAdminRequiredException, MissingTenantContextException } from '../exceptions/tenant-isolation.exceptions';

interface IRequestForPlatformAdminGuard {
  user?: { sub?: string };
}

/**
 * Guards platform-level, non-tenant-scoped resources (e.g. the Plan
 * Management catalog) that must never be mutable by an ordinary workspace
 * OWNER/ADMIN — only true ATLAS-staff platform admins. Deliberately
 * independent of `TenantIsolationGuard`: those routes have no workspace to
 * check membership against at all. Resolves `isPlatformAdmin` directly
 * (guards run before the global `TenantContextInterceptor`, so its
 * `AsyncLocalStorage` context is not yet populated at this point).
 */
@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly usersRepository: UsersRepository) {}

  async canActivate(executionContext: ExecutionContext): Promise<boolean> {
    const request = executionContext.switchToHttp().getRequest<IRequestForPlatformAdminGuard>();
    if (!request.user?.sub) {
      throw new MissingTenantContextException();
    }

    const user = await this.usersRepository.findById(request.user.sub);
    if (!user?.isPlatformAdmin) {
      throw new PlatformAdminRequiredException();
    }

    return true;
  }
}
