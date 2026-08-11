import { Injectable, Logger } from '@nestjs/common';
import { IRuleActionHandler } from './interfaces';

/**
 * RuleActionRegistryService — the extension point that keeps module-specific
 * business logic out of the core engine. The engine ships handlers only for
 * actions that wrap already-generic modules (NOTIFY, CREATE_TASK,
 * REQUIRE_APPROVAL, EMIT_EVENT); any other action type (e.g. `UPDATE_STATUS`,
 * `ROUTE_WORKFLOW`, or a custom type) must be registered here by the owning
 * module, typically from its own `onModuleInit()`.
 */
@Injectable()
export class RuleActionRegistryService {
  private readonly logger = new Logger(RuleActionRegistryService.name);
  private readonly handlers = new Map<string, IRuleActionHandler>();

  register(handler: IRuleActionHandler): void {
    if (this.handlers.has(handler.actionType)) {
      this.logger.warn(`Overwriting existing rule action handler for type '${handler.actionType}'`);
    }
    this.handlers.set(handler.actionType, handler);
  }

  get(actionType: string): IRuleActionHandler | undefined {
    return this.handlers.get(actionType);
  }

  has(actionType: string): boolean {
    return this.handlers.has(actionType);
  }
}
