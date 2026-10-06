import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { ITenantContext } from './interfaces';
import { MissingTenantContextException } from './exceptions/tenant-isolation.exceptions';

/**
 * TenantContextService — carries the resolved `ITenantContext` through the
 * entire async call stack of a request via `AsyncLocalStorage`, so any
 * service/repository deep in the stack can read "which tenant is this"
 * without it being threaded through every method signature. Populated once
 * per request by `TenantContextInterceptor`; for background jobs, a worker
 * restores it explicitly via `run()` using the context stamped onto the job
 * payload by `stampJobTenantContext()`.
 */
@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<ITenantContext>();

  run<T>(context: ITenantContext, fn: () => T): T {
    return this.storage.run(context, fn);
  }

  getContext(): ITenantContext | undefined {
    return this.storage.getStore();
  }

  getContextOrThrow(): ITenantContext {
    const context = this.storage.getStore();
    if (!context) {
      throw new MissingTenantContextException();
    }
    return context;
  }

  getWorkspaceId(): string | undefined {
    return this.storage.getStore()?.workspaceId;
  }

  isPlatformAdmin(): boolean {
    return this.storage.getStore()?.isPlatformAdmin ?? false;
  }
}
