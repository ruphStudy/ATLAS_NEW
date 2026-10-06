import { Injectable, Logger } from '@nestjs/common';
import { TRADEINDIA_COUNTRIES, SUPPLIER_PROVIDERS } from '../../constants';
import { SupplierSourceProvider } from '../../interfaces';
import type { IDiscoveredSupplier, ISupplierProvider, ISupplierProviderDiscoverParams } from '../../interfaces';

/**
 * TradeIndiaProvider
 *
 * Supplier discovery provider for TradeIndia — India's second-largest B2B marketplace.
 *
 * Production implementation will use the TradeIndia Business API.
 * Currently a stub for pipeline validation.
 */
@Injectable()
export class TradeIndiaProvider implements ISupplierProvider {
  private readonly logger = new Logger(TradeIndiaProvider.name);

  readonly provider = SupplierSourceProvider.TRADEINDIA;
  readonly supportedCountries: readonly string[] = TRADEINDIA_COUNTRIES;

  supportsCountry(country: string): boolean {
    return (this.supportedCountries as string[]).includes(country.toUpperCase());
  }

  async *discover(params: ISupplierProviderDiscoverParams): AsyncIterable<IDiscoveredSupplier> {
    const { keyword, country, category } = params;

    this.logger.debug(`TradeIndia discovery: "${keyword}" in ${country}`);

    const count = 2 + (keyword.length % 4);
    const cities = ['Delhi', 'Noida', 'Ludhiana', 'Rajkot', 'Jaipur', 'Kolkata', 'Kanpur'];

    for (let i = 0; i < count; i++) {
      await new Promise((resolve) => setTimeout(resolve, 40));

      const cityIdx = (this.hashCode(keyword) + i) % cities.length;
      const city = cities[cityIdx] ?? 'Delhi';

      yield {
        name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Manufacturers – TradeIndia ${city} (${i + 1})`,
        provider: SupplierSourceProvider.TRADEINDIA,
        providerSupplierId: `TI-${this.hashCode(keyword)}-${i}`,
        country: 'IN',
        city,
        website: `https://tradeindia.com/supplier/${this.hashCode(keyword)}-${i}`,
        contactEmail: null,
        contactPhone: null,
        categories: category ? [category] : [],
        minOrderQuantity: (i + 2) * 100,
        avgLeadTimeDays: 10 + i * 3,
        overallRating: Math.round((3.2 + (this.hashCode(keyword) % 17) / 10) * 10) / 10,
        rawData: {
          source: 'tradeindia_stub',
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
      hash = (hash * 37 + str.charCodeAt(i)) & 0xffffff;
    }
    return hash;
  }
}
