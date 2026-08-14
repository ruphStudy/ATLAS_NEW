import { Injectable, Logger } from '@nestjs/common';
import { ICountry, CountryStatus } from '../interfaces';

/**
 * CountryRegistry
 *
 * In-memory registry of all registered countries. Seeded from the database
 * on startup and kept in sync by the service on every write. Fast local
 * look-ups without DB round-trips — does not replace the database.
 */
@Injectable()
export class CountryRegistry {
  private readonly logger = new Logger(CountryRegistry.name);

  /** countryCode → country */
  private readonly countries = new Map<string, ICountry>();

  register(country: ICountry): void {
    this.countries.set(country.code.toUpperCase(), country);
  }

  unregister(code: string): void {
    this.countries.delete(code.toUpperCase());
  }

  get(code: string): ICountry | undefined {
    return this.countries.get(code.toUpperCase());
  }

  getAll(): ICountry[] {
    return [...this.countries.values()];
  }

  getActive(): ICountry[] {
    return this.getAll().filter((c) => c.status === CountryStatus.ACTIVE);
  }

  getByRegion(region: string): ICountry[] {
    return this.getAll().filter((c) => c.region === region);
  }

  isRegistered(code: string): boolean {
    return this.countries.has(code.toUpperCase());
  }

  get count(): number {
    return this.countries.size;
  }

  seed(countries: ICountry[]): void {
    this.countries.clear();
    countries.forEach((c) => this.register(c));
    this.logger.log(`Registry seeded: ${this.countries.size} countries`);
  }

  flush(): void {
    this.countries.clear();
  }
}
