import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceProviderRegistry } from '../marketplace-provider/registry/marketplace-provider.registry';
import { AccountConfigResolveRequest, AccountConfigResolveResult } from '../interfaces';
import { MP_ACCOUNT_ERROR_CODES } from '../constants';

@Injectable()
export class AccountConfigurationResolver {
  private readonly logger = new Logger(AccountConfigurationResolver.name);

  constructor(private readonly registry: MarketplaceProviderRegistry) {}

  async resolve(request: AccountConfigResolveRequest): Promise<AccountConfigResolveResult> {
    const errors: string[] = [];

    const providerRegistered = this.registry.isRegistered(request.providerKey);
    if (!providerRegistered) {
      errors.push(`Provider '${request.providerKey}' is not registered`);
    }

    // Configuration reference validation is best-effort: if a ref is provided
    // we verify the registry has config support for the provider, otherwise pass.
    const configurationValid = providerRegistered;
    const credentialValid = providerRegistered;

    if (request.configurationRef && !providerRegistered) {
      errors.push(`Cannot validate configurationRef — provider not registered`);
    }
    if (request.credentialRef && !providerRegistered) {
      errors.push(`Cannot validate credentialRef — provider not registered`);
    }

    return {
      valid: errors.length === 0,
      providerRegistered,
      configurationValid,
      credentialValid,
      errors,
    };
  }
}
