import { Injectable, Logger } from '@nestjs/common';
import { ICurrency, CurrencyStatus } from '../interfaces';

/**
 * CurrencyRegistry
 *
 * In-memory registry of all registered currencies. Seeded from the
 * database on startup and kept in sync by the service on every write.
 * Fast local look-ups without DB round-trips — does not replace the
 * database. Mirrors `CountryRegistry`.
 */
@Injectable()
export class CurrencyRegistry {
  private readonly logger = new Logger(CurrencyRegistry.name);

  /** currencyCode → currency */
  private readonly currencies = new Map<string, ICurrency>();

  register(currency: ICurrency): void {
    this.currencies.set(currency.code.toUpperCase(), currency);
  }

  unregister(code: string): void {
    this.currencies.delete(code.toUpperCase());
  }

  get(code: string): ICurrency | undefined {
    return this.currencies.get(code.toUpperCase());
  }

  getAll(): ICurrency[] {
    return [...this.currencies.values()];
  }

  getActive(): ICurrency[] {
    return this.getAll().filter((c) => c.status === CurrencyStatus.ACTIVE);
  }

  isRegistered(code: string): boolean {
    return this.currencies.has(code.toUpperCase());
  }

  isActive(code: string): boolean {
    return this.currencies.get(code.toUpperCase())?.status === CurrencyStatus.ACTIVE;
  }

  get count(): number {
    return this.currencies.size;
  }

  seed(currencies: ICurrency[]): void {
    this.currencies.clear();
    currencies.forEach((c) => this.register(c));
    this.logger.log(`Registry seeded: ${this.currencies.size} currencies`);
  }

  flush(): void {
    this.currencies.clear();
  }
}
