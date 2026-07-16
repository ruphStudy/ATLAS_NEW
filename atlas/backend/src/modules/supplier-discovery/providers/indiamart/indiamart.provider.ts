import { Injectable, Logger } from '@nestjs/common';
import { INDIAMART_COUNTRIES, SUPPLIER_PROVIDERS } from '../../constants';
import { SupplierSourceProvider } from '../../interfaces';
import type { IDiscoveredSupplier, ISupplierProvider, ISupplierProviderDiscoverParams } from '../../interfaces';

/**
 * IndiaMartProvider
 *
 * Supplier discovery provider for IndiaMART — India's largest B2B marketplace.
 *
 * Production implementation will use:
 *   - IndiaMART Lead Manager API (https://developer.indiamart.com)
 *   - Web scraping as fallback
 *
 * Currently a stub that returns simulated supplier data for pipeline validation.
 */
@Injectable()
export class IndiaMartProvider implements ISupplierProvider {
  private readonly logger = new Logger(IndiaMartProvider.name);

  readonly provider = SupplierSourceProvider.INDIAMART;
  readonly supportedCountries: readonly string[] = INDIAMART_COUNTRIES;

  supportsCountry(country: string): boolean {
    return (this.supportedCountries as string[]).includes(country.toUpperCase());
  }

  async *discover(params: ISupplierProviderDiscoverParams): AsyncIterable<IDiscoveredSupplier> {
    const { keyword, country, category } = params;

    this.logger.debug(`IndiaMART discovery: "${keyword}" in ${country}`);

    // Stub: 3–6 simulated suppliers per keyword
    const count = 3 + (keyword.length % 4);
    const cities = ['Mumbai', 'Delhi', 'Surat', 'Ahmedabad', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad'];

    for (let i = 0; i < count; i++) {
      await new Promise((resolve) => setTimeout(resolve, 40));

      const cityIdx = (keyword.charCodeAt(i % keyword.length) ?? 0 + i) % cities.length;
      const city = cities[cityIdx] ?? 'Mumbai';
      const base = 40 + (keyword.charCodeAt(0) ?? 65 + i * 5) % 40;

      yield {
        name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Suppliers & Traders – ${city} (${i + 1})`,
        provider: SupplierSourceProvider.INDIAMART,
        providerSupplierId: `IM-${this.hashCode(keyword)}-${i}`,
        country: 'IN',
        city,
        website: `https://indiamart.com/supplier/${this.hashCode(keyword)}-${i}`,
        contactEmail: null,
        contactPhone: null,
        categories: category ? [category] : [],
        minOrderQuantity: (i + 1) * 50,
        avgLeadTimeDays: 7 + i * 2,
        overallRating: Math.round((3 + (base % 20) / 10) * 10) / 10,
        rawData: {
          source: 'indiamart_stub',
          keyword,
          country,
          category: category ?? null,
          rank: i + 1,
          timestamp: new Date().toISOString(),
          apiVersion: 'stub-v1',
        },
      };
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) & 0xffffff;
    }
    return hash;
  }
}
