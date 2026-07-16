import { Injectable, Logger } from '@nestjs/common';
import { ALIBABA_COUNTRIES, SUPPLIER_PROVIDERS } from '../../constants';
import { SupplierSourceProvider } from '../../interfaces';
import type { IDiscoveredSupplier, ISupplierProvider, ISupplierProviderDiscoverParams } from '../../interfaces';

/**
 * AlibabaProvider
 *
 * Supplier discovery provider for Alibaba — global B2B platform.
 *
 * Production implementation will use:
 *   - Alibaba Open Platform API (https://developers.alibaba.com)
 *
 * Currently a stub for pipeline validation.
 */
@Injectable()
export class AlibabaProvider implements ISupplierProvider {
  private readonly logger = new Logger(AlibabaProvider.name);

  readonly provider = SupplierSourceProvider.ALIBABA;
  readonly supportedCountries: readonly string[] = ALIBABA_COUNTRIES;

  supportsCountry(country: string): boolean {
    return (this.supportedCountries as string[]).includes(country.toUpperCase());
  }

  async *discover(params: ISupplierProviderDiscoverParams): AsyncIterable<IDiscoveredSupplier> {
    const { keyword, country, category } = params;

    this.logger.debug(`Alibaba discovery: "${keyword}" in ${country}`);

    const count = 4 + (keyword.length % 5);
    const citiesByCountry: Record<string, string[]> = {
      CN: ['Yiwu', 'Guangzhou', 'Shenzhen', 'Ningbo', 'Shanghai', 'Dongguan'],
      IN: ['Mumbai', 'Delhi', 'Surat', 'Ahmedabad', 'Bangalore'],
    };
    const cities = citiesByCountry[country.toUpperCase()] ?? ['Global'];

    for (let i = 0; i < count; i++) {
      await new Promise((resolve) => setTimeout(resolve, 30));

      const cityIdx = (this.hashCode(keyword) + i) % cities.length;
      const city = cities[cityIdx] ?? 'Global';
      const isGoldSupplier = i < 2;

      yield {
        name: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} Co., Ltd. – ${city} (${i + 1})`,
        provider: SupplierSourceProvider.ALIBABA,
        providerSupplierId: `ALI-${this.hashCode(keyword)}-${i}`,
        country: country.toUpperCase(),
        city,
        website: `https://alibaba.com/supplier/${this.hashCode(keyword)}-${i}`,
        contactEmail: null,
        contactPhone: null,
        categories: category ? [category] : [],
        minOrderQuantity: isGoldSupplier ? (i + 1) * 100 : (i + 1) * 500,
        avgLeadTimeDays: 15 + i * 5,
        overallRating: isGoldSupplier
          ? Math.round((4.0 + (this.hashCode(keyword) % 10) / 10) * 10) / 10
          : Math.round((3.0 + (this.hashCode(keyword) % 15) / 10) * 10) / 10,
        rawData: {
          source: 'alibaba_stub',
          keyword,
          country,
          category: category ?? null,
          rank: i + 1,
          isGoldSupplier,
          timestamp: new Date().toISOString(),
          apiVersion: 'stub-v1',
        },
      };
    }
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 41 + str.charCodeAt(i)) & 0xffffff;
    }
    return hash;
  }
}
