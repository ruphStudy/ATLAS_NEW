import { Injectable } from '@nestjs/common';
import { RegionalSettingsRepository } from '../repository/regional-settings.repository';
import { RegionalSettingsCache } from '../cache/regional-settings.cache';
import { IRegionalSettingsProfile } from '../interfaces';
import { REGIONAL_SETTINGS_SCOPE_PRECEDENCE } from '../constants';

/**
 * RegionalSettingsResolver
 *
 * Finds every PUBLISHED profile applicable to a context (global, country,
 * region, organization, workspace) and orders them from least to most
 * specific — `RegionalSettingsService.resolveEffectiveSettings()` then
 * merges them in that order so a more specific profile only overrides the
 * fields it explicitly sets, never the ones it leaves blank.
 */
@Injectable()
export class RegionalSettingsResolver {
  constructor(
    private readonly repository: RegionalSettingsRepository,
    private readonly cache: RegionalSettingsCache,
  ) {}

  async resolveApplicableProfiles(
    workspaceId: string,
    organizationId: string | null,
    countryCode: string | null,
    regionCode: string | null,
    effectiveDate: Date,
  ): Promise<IRegionalSettingsProfile[]> {
    const cacheKey = RegionalSettingsCache.buildProfileSetKey(workspaceId, countryCode, regionCode, effectiveDate);
    const cached = this.cache.getProfileSet(cacheKey);
    if (cached) return cached;

    const raws = await this.repository.findApplicableProfiles(workspaceId, organizationId, countryCode, regionCode, effectiveDate);
    const profiles = (raws as unknown as IRegionalSettingsProfile[]).sort(
      (a, b) => this.scoreSpecificity(a) - this.scoreSpecificity(b),
    );

    this.cache.setProfileSet(cacheKey, profiles);
    return profiles;
  }

  /** Lowest → highest specificity, so callers can fold profiles in merge order (later entries win). */
  private scoreSpecificity(profile: IRegionalSettingsProfile): number {
    const tierRank = REGIONAL_SETTINGS_SCOPE_PRECEDENCE.indexOf(profile.scopeType as (typeof REGIONAL_SETTINGS_SCOPE_PRECEDENCE)[number]);
    return tierRank * 1000 + profile.priority;
  }
}
