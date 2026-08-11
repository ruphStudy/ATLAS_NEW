import { ITenantContext, ITenantJobContext } from './interfaces';

/**
 * Attaches the current tenant context onto a BullMQ job payload before it is
 * enqueued, so the worker (which runs outside the HTTP request lifecycle and
 * therefore has no `AsyncLocalStorage` context of its own) can restore it.
 * Existing queues are free to ignore this field entirely — it is additive
 * and does not change any existing job payload shape.
 */
export function stampJobTenantContext<T extends Record<string, unknown>>(
  jobData: T,
  context: ITenantContext,
): T & { tenantContext: ITenantJobContext } {
  return { ...jobData, tenantContext: context };
}

/**
 * Runs `fn` with the tenant context restored from a job payload previously
 * stamped by `stampJobTenantContext`. A worker calls this at the top of its
 * `process()` method:
 *
 *   async process(job: Job<{ tenantContext?: ITenantJobContext }>) {
 *     return withRestoredTenantContext(this.tenantContextService, job.data.tenantContext, () => this.handle(job));
 *   }
 *
 * If the job predates this stamping (or a caller chose not to stamp it),
 * `fn` still runs — just without an active tenant context — so this is
 * purely additive and never breaks an existing worker.
 */
export function withRestoredTenantContext<T>(
  tenantContextService: { run<R>(context: ITenantContext, fn: () => R): R },
  tenantContext: ITenantJobContext | undefined,
  fn: () => T,
): T {
  if (!tenantContext) {
    return fn();
  }
  return tenantContextService.run(tenantContext, fn);
}
