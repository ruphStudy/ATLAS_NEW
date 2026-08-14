import { Injectable, Logger } from '@nestjs/common';
import { ITaxJurisdiction } from '../interfaces';

/**
 * TaxJurisdictionRegistry
 *
 * In-memory registry of all registered tax jurisdictions. Seeded from the
 * database on startup and kept in sync by the service on every write.
 * Mirrors `CountryRegistry`/`CurrencyRegistry`. Tax rules themselves are
 * resolved via `TaxRepository` + `TaxCache` (effective-date driven, like
 * exchange rates), not held in an in-memory registry.
 */
@Injectable()
export class TaxJurisdictionRegistry {
  private readonly logger = new Logger(TaxJurisdictionRegistry.name);

  private readonly jurisdictions = new Map<string, ITaxJurisdiction>();

  register(jurisdiction: ITaxJurisdiction): void {
    this.jurisdictions.set(jurisdiction.code.toUpperCase(), jurisdiction);
  }

  get(code: string): ITaxJurisdiction | undefined {
    return this.jurisdictions.get(code.toUpperCase());
  }

  getAll(): ITaxJurisdiction[] {
    return [...this.jurisdictions.values()];
  }

  getByCountry(countryCode: string): ITaxJurisdiction[] {
    return this.getAll().filter((j) => j.countryCode.toUpperCase() === countryCode.toUpperCase());
  }

  isRegistered(code: string): boolean {
    return this.jurisdictions.has(code.toUpperCase());
  }

  get count(): number {
    return this.jurisdictions.size;
  }

  seed(jurisdictions: ITaxJurisdiction[]): void {
    this.jurisdictions.clear();
    jurisdictions.forEach((j) => this.register(j));
    this.logger.log(`Registry seeded: ${this.jurisdictions.size} tax jurisdictions`);
  }

  flush(): void {
    this.jurisdictions.clear();
  }
}
