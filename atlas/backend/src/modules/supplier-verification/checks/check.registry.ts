import { Injectable, Logger } from '@nestjs/common';
import { CHECK_NAMES } from '../constants';
import type { IVerificationCheck } from '../interfaces';

/**
 * VerificationCheckRegistry
 *
 * Holds all registered verification checks.
 * New checks are added by injecting them via the module factory.
 * Open/Closed Principle: no service changes required to add a check.
 */
@Injectable()
export class VerificationCheckRegistry {
  private readonly logger = new Logger(VerificationCheckRegistry.name);
  private readonly checks = new Map<string, IVerificationCheck>();

  constructor(checks: IVerificationCheck[]) {
    for (const check of checks) {
      this.register(check);
    }
  }

  register(check: IVerificationCheck): void {
    this.checks.set(check.checkName, check);
    this.logger.log(`Registered verification check: ${check.checkName}`);
  }

  getAll(): IVerificationCheck[] {
    return Array.from(this.checks.values());
  }

  get(checkName: string): IVerificationCheck | undefined {
    return this.checks.get(checkName);
  }

  getCheckNames(): string[] {
    return Array.from(this.checks.keys());
  }
}
