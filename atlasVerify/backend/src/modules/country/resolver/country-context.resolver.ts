import { Injectable, Logger } from '@nestjs/common';
import {
  CountryContext,
  CountryResolutionRequest,
  CountryResolutionResult,
  CountryResolutionStatus,
  CountryStatus,
  ICountry,
  IWorkspaceCountryConfig,
} from '../interfaces';
import { CountryRegistry } from '../registry/country.registry';
import { CountryCache } from '../cache/country.cache';
import { CountryRepository } from '../repository/country.repository';

/**
 * CountryContextResolver
 *
 * Resolves the effective country context for a workspace — the single
 * entry point marketplace, procurement, inventory, billing and analytics
 * operations use to find out "which country, and what settings apply".
 * Applies global < organization < workspace override precedence and falls
 * back to `fallbackCountryCode` when the requested/default country isn't
 * enabled. Mirrors `MarketplaceCapabilityResolver`'s structure.
 */
@Injectable()
export class CountryContextResolver {
  private readonly logger = new Logger(CountryContextResolver.name);

  constructor(
    private readonly registry: CountryRegistry,
    private readonly cache: CountryCache,
    private readonly repository: CountryRepository,
  ) {}

  async resolve(request: CountryResolutionRequest): Promise<CountryResolutionResult> {
    const start = Date.now();

    const cached = this.cache.getResolution(request.workspaceId, request.countryCode);
    if (cached) return cached;

    const result = await this.doResolve(request, start);
    this.cache.setResolution(request.workspaceId, request.countryCode, result);
    return result;
  }

  private async doResolve(request: CountryResolutionRequest, startMs: number): Promise<CountryResolutionResult> {
    const base = {
      workspaceId: request.workspaceId,
      requestedCountryCode: request.countryCode ?? null,
      resolvedAt: new Date(),
    };

    const workspaceConfigsRaw = await this.repository.findWorkspaceConfigs(request.workspaceId);
    const workspaceConfigs = workspaceConfigsRaw as unknown as IWorkspaceCountryConfig[];

    let targetCode = request.countryCode?.toUpperCase() ?? null;

    if (!targetCode) {
      const defaultConfig =
        workspaceConfigs.find((c) => c.isDefault && c.isEnabled) ??
        [...workspaceConfigs].filter((c) => c.isEnabled).sort((a, b) => a.priority - b.priority)[0];

      if (!defaultConfig) {
        return {
          ...base,
          status: CountryResolutionStatus.NOT_ENABLED_FOR_WORKSPACE,
          context: null,
          reasons: ['No default or enabled country configured for this workspace'],
          resolutionTimeMs: Date.now() - startMs,
        };
      }
      targetCode = defaultConfig.countryCode.toUpperCase();
    }

    let country = await this.getCountry(targetCode);
    if (!country) {
      return {
        ...base,
        status: CountryResolutionStatus.NOT_REGISTERED,
        context: null,
        reasons: [`Country '${targetCode}' is not registered`],
        resolutionTimeMs: Date.now() - startMs,
      };
    }

    if (country.status === CountryStatus.DISABLED || country.status === CountryStatus.ARCHIVED) {
      return {
        ...base,
        status: CountryResolutionStatus.DISABLED,
        context: null,
        reasons: [`Country '${targetCode}' is ${country.status}`],
        resolutionTimeMs: Date.now() - startMs,
      };
    }

    let effectiveCode = targetCode;
    let workspaceConfig = workspaceConfigs.find((c) => c.countryCode.toUpperCase() === targetCode);
    let fallbackApplied = false;

    if (!workspaceConfig || !workspaceConfig.isEnabled) {
      const fallbackCode = workspaceConfig?.fallbackCountryCode?.toUpperCase();
      const fallbackConfig = fallbackCode
        ? workspaceConfigs.find((c) => c.countryCode.toUpperCase() === fallbackCode && c.isEnabled)
        : undefined;

      if (fallbackConfig) {
        const fallbackCountry = await this.getCountry(fallbackConfig.countryCode);
        if (fallbackCountry && fallbackCountry.status !== CountryStatus.DISABLED && fallbackCountry.status !== CountryStatus.ARCHIVED) {
          effectiveCode = fallbackConfig.countryCode.toUpperCase();
          workspaceConfig = fallbackConfig;
          country = fallbackCountry;
          fallbackApplied = true;
        }
      }

      if (!workspaceConfig || !workspaceConfig.isEnabled) {
        return {
          ...base,
          status: CountryResolutionStatus.NOT_ENABLED_FOR_WORKSPACE,
          context: null,
          reasons: [`Country '${targetCode}' is not enabled for this workspace`],
          resolutionTimeMs: Date.now() - startMs,
        };
      }
    }

    const overridesRaw = await this.repository.findOverrides(effectiveCode, request.workspaceId, request.organizationId);
    const overrides = this.mergeOverrides(overridesRaw as unknown as { overrideValue: Record<string, unknown> }[]);

    const context: CountryContext = {
      code: country.code,
      name: country.name,
      region: country.region,
      timezone: country.timezone,
      locale: country.locale,
      currency: country.currency,
      language: country.language,
      supportedLocales: country.supportedLocales,
      supportedCurrencies: country.supportedCurrencies,
      supportedLanguages: country.supportedLanguages,
      taxRegime: country.taxRegime,
      complianceRefs: country.complianceRefs,
      businessRules: country.businessRules,
      isDefault: workspaceConfig.isDefault,
      isPreferred: workspaceConfig.isPreferred,
      configuration: workspaceConfig.configuration ?? {},
      overrides,
    };

    return {
      ...base,
      status: fallbackApplied ? CountryResolutionStatus.FALLBACK_APPLIED : CountryResolutionStatus.RESOLVED,
      context,
      reasons: fallbackApplied ? [`Fell back from '${targetCode}' to '${effectiveCode}'`] : [],
      resolutionTimeMs: Date.now() - startMs,
    };
  }

  private async getCountry(code: string): Promise<ICountry | undefined> {
    let country = this.registry.get(code);
    if (!country) {
      const raw = await this.repository.findByCode(code);
      if (raw) {
        country = raw as unknown as ICountry;
        this.registry.register(country);
      }
    }
    return country;
  }

  /** Applies override precedence — array is already priority-sorted ascending by the repository; later entries win. */
  private mergeOverrides(overrides: { overrideValue: Record<string, unknown> }[]): Record<string, unknown> {
    return overrides.reduce<Record<string, unknown>>((acc, o) => ({ ...acc, ...(o.overrideValue ?? {}) }), {});
  }
}
