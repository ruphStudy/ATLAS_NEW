import { Injectable } from '@nestjs/common';
import { PaymentProviderRegistry } from './payment-provider.registry';
import { IPaymentProviderAccount, IProviderResolutionOptions, IResolvedPaymentProvider, PaymentProviderAccountStatus } from '../interfaces';

/**
 * PaymentProviderFactory — selects the best adapter+account pair for a
 * request, mirroring `MarketplaceProviderFactory.select()`: a preferred
 * account wins if it's still capable, otherwise the pool of ACTIVE,
 * capability/country/currency-matching accounts is sorted by `priority`
 * ascending (lower number wins) with `isDefault` as the tiebreaker.
 */
@Injectable()
export class PaymentProviderFactory {
  constructor(private readonly registry: PaymentProviderRegistry) {}

  select(options: IProviderResolutionOptions, candidateAccounts: IPaymentProviderAccount[]): IResolvedPaymentProvider | null {
    const usable = candidateAccounts.filter((account) => this.isUsable(account, options));

    if (options.preferredAccountId) {
      const preferred = usable.find((a) => a.id === options.preferredAccountId);
      if (preferred) {
        const adapter = this.registry.get(preferred.providerKey);
        if (adapter) return { adapter, account: preferred };
      }
    }

    const sorted = [...usable].sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
      return 0;
    });

    for (const account of sorted) {
      const adapter = this.registry.get(account.providerKey);
      if (adapter) return { adapter, account };
    }

    return null;
  }

  /** All usable accounts in priority order — for failover: try the next one if the first fails. */
  selectAll(options: IProviderResolutionOptions, candidateAccounts: IPaymentProviderAccount[]): IResolvedPaymentProvider[] {
    return candidateAccounts
      .filter((account) => this.isUsable(account, options))
      .sort((a, b) => a.priority - b.priority)
      .map((account) => {
        const adapter = this.registry.get(account.providerKey);
        return adapter ? { adapter, account } : null;
      })
      .filter((r): r is IResolvedPaymentProvider => r !== null);
  }

  private isUsable(account: IPaymentProviderAccount, options: IProviderResolutionOptions): boolean {
    if (account.status !== PaymentProviderAccountStatus.ACTIVE) return false;

    const adapter = this.registry.get(account.providerKey);
    if (!adapter) return false;
    if (!adapter.supportsCapability(options.capability)) return false;

    if (options.country) {
      const accountCountries = account.supportedCountries.length > 0 ? account.supportedCountries : adapter.metadata.supportedCountries;
      if (accountCountries.length > 0 && !accountCountries.includes(options.country)) return false;
    }

    if (options.currency) {
      const accountCurrencies = account.supportedCurrencies.length > 0 ? account.supportedCurrencies : adapter.metadata.supportedCurrencies;
      if (accountCurrencies.length > 0 && !accountCurrencies.includes(options.currency)) return false;
    }

    return true;
  }
}
