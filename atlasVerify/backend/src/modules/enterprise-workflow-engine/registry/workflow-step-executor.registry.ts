import { Injectable, Logger } from '@nestjs/common';
import { IWorkflowStepExecutor } from '../interfaces';

/**
 * WorkflowStepExecutorRegistry — the extension point that keeps
 * module-specific business logic out of the core engine, mirroring
 * `RuleActionRegistryService` in Business Rules Engine. The engine ships
 * built-in executors only for step types that wrap already-generic
 * modules (TASK, APPROVAL, NOTIFICATION, RULE_EVALUATION, AI_WORKFLOW);
 * any other step type (e.g. a module's own `BUSINESS_ACTION`/
 * `EXTERNAL_INTEGRATION` step) must be registered here by the owning
 * module, typically from its own `onModuleInit()`.
 */
@Injectable()
export class WorkflowStepExecutorRegistry {
  private readonly logger = new Logger(WorkflowStepExecutorRegistry.name);
  private readonly executors = new Map<string, IWorkflowStepExecutor>();

  register(executor: IWorkflowStepExecutor): void {
    if (this.executors.has(executor.stepType)) {
      this.logger.warn(`Overwriting existing workflow step executor for type '${executor.stepType}'`);
    }
    this.executors.set(executor.stepType, executor);
  }

  get(stepType: string): IWorkflowStepExecutor | undefined {
    return this.executors.get(stepType);
  }

  has(stepType: string): boolean {
    return this.executors.has(stepType);
  }

  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys());
  }
}
