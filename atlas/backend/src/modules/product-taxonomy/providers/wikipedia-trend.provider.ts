import { Injectable, Logger } from '@nestjs/common';
import { TREND_DISCOVERY_CONSTANTS } from '../constants';
import type { IAttentionEvidence, IConceptDiscoveryProvider, ITrendConceptCandidate } from '../interfaces';

interface IWikiCategoryMember {
  pageid: number;
  ns: number;
  title: string;
}

interface IWikiCategoryMembersResponse {
  query?: { categorymembers?: IWikiCategoryMember[] };
}

interface IWikiPageviewItem {
  article: string;
  timestamp: string;
  views: number;
}

interface IWikiPageviewsResponse {
  items?: IWikiPageviewItem[];
}

const WIKI_ACTION_API = 'https://en.wikipedia.org/w/api.php';
const WIKI_PAGEVIEWS_API =
  'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents';
/** ns:0 = article, ns:14 = subcategory — the only two Wikipedia namespaces this provider cares about. */
const WIKI_NS_ARTICLE = 0;
const WIKI_NS_SUBCATEGORY = 14;

/**
 * WikipediaTrendProvider
 *
 * Real, official Wikimedia APIs only (MediaWiki Action API for category
 * membership, Wikimedia REST API for pageviews) — no scraping, no
 * unofficial endpoints, no API key required. This is ATTENTION evidence
 * only: real people reading a Wikipedia article is not the same as real
 * people wanting to buy the product it describes, and every value this
 * class produces is labelled that way by its caller, never as demand.
 */
@Injectable()
export class WikipediaTrendProvider implements IConceptDiscoveryProvider {
  private readonly logger = new Logger(WikipediaTrendProvider.name);
  readonly source = 'WIKIPEDIA';

  /** Process-local cache for category-member lookups within/across nearby runs — Wikipedia category membership changes slowly, so a short TTL is enough to avoid redundant calls inside one cold-start pass. */
  private readonly categoryCache = new Map<string, { value: IWikiCategoryMember[]; expiresAt: number }>();
  private static readonly CATEGORY_CACHE_TTL_MS = 60 * 60 * 1000;

  async discoverConcepts(
    seedCategories: string[],
    maxLevels: number,
  ): Promise<ITrendConceptCandidate[]> {
    const candidates: ITrendConceptCandidate[] = [];
    const seenNames = new Set<string>();

    for (const seed of seedCategories) {
      if (candidates.length >= TREND_DISCOVERY_CONSTANTS.MAX_TOTAL_CONCEPTS_PER_RUN) break;

      const members = await this.getCategoryMembers(seed);
      const articles = members.filter((m) => m.ns === WIKI_NS_ARTICLE);
      const subcats = members.filter((m) => m.ns === WIKI_NS_SUBCATEGORY);

      this.addCandidates(candidates, seenNames, articles, seed, null);

      if (maxLevels >= 2) {
        const boundedSubcats = subcats.slice(0, TREND_DISCOVERY_CONSTANTS.MAX_SUBCATEGORIES_PER_SEED);
        for (const subcat of boundedSubcats) {
          if (candidates.length >= TREND_DISCOVERY_CONSTANTS.MAX_TOTAL_CONCEPTS_PER_RUN) break;
          const subcatName = this.stripCategoryPrefix(subcat.title);
          const subMembers = await this.getCategoryMembers(subcatName);
          const subArticles = subMembers.filter((m) => m.ns === WIKI_NS_ARTICLE);
          this.addCandidates(candidates, seenNames, subArticles, subcatName, seed);
        }
      }
    }

    return candidates;
  }

  async getAttentionEvidence(conceptName: string): Promise<IAttentionEvidence | null> {
    const { PAGEVIEWS_WINDOW_DAYS, PAGEVIEWS_LAG_DAYS } = TREND_DISCOVERY_CONSTANTS;
    const end = this.daysAgo(PAGEVIEWS_LAG_DAYS);
    const start = this.daysAgo(PAGEVIEWS_LAG_DAYS + PAGEVIEWS_WINDOW_DAYS);
    const article = encodeURIComponent(conceptName.trim().replace(/ /g, '_'));
    const url = `${WIKI_PAGEVIEWS_API}/${article}/daily/${this.formatDate(start)}/${this.formatDate(end)}`;

    let response: IWikiPageviewsResponse;
    try {
      response = await this.get<IWikiPageviewsResponse>(url);
    } catch (err) {
      // Includes Wikimedia's real 404 for articles with no pageview history
      // (too new/obscure) — that is a genuine "no evidence", not an error
      // to fabricate around.
      this.logger.debug(`No pageview data for "${conceptName}": ${(err as Error).message}`);
      return null;
    }

    const series = response.items ?? [];
    if (series.length < 4) return null; // too little real data to compute an honest growth trend

    const midpoint = Math.floor(series.length / 2);
    const earlierHalf = series.slice(0, midpoint);
    const recentHalf = series.slice(midpoint);
    const earlierAvg = this.average(earlierHalf.map((i) => i.views));
    const recentAvg = this.average(recentHalf.map((i) => i.views));

    if (earlierAvg <= 0) return null; // avoid a division-by-zero / infinite "growth" on a near-zero base

    const growthPct = ((recentAvg - earlierAvg) / earlierAvg) * 100;

    return {
      value: Math.round(growthPct * 100) / 100,
      unit: 'percent_change_30d',
      capturedAt: new Date(),
      rawPayload: {
        article: conceptName,
        windowDays: PAGEVIEWS_WINDOW_DAYS,
        earlierAvgDailyViews: Math.round(earlierAvg),
        recentAvgDailyViews: Math.round(recentAvg),
        totalViews: series.reduce((sum, i) => sum + i.views, 0),
        dailySeries: series.map((i) => ({ date: i.timestamp, views: i.views })),
      },
    };
  }

  // ── Private ───────────────────────────────────────────────────

  private addCandidates(
    candidates: ITrendConceptCandidate[],
    seenNames: Set<string>,
    articles: IWikiCategoryMember[],
    categoryName: string,
    categoryParentName: string | null,
  ): void {
    const bounded = articles.slice(0, TREND_DISCOVERY_CONSTANTS.MAX_ARTICLES_PER_CATEGORY);
    for (const article of bounded) {
      if (candidates.length >= TREND_DISCOVERY_CONSTANTS.MAX_TOTAL_CONCEPTS_PER_RUN) break;
      const name = article.title.trim();
      const key = name.toLowerCase();
      if (seenNames.has(key)) continue;
      seenNames.add(key);
      candidates.push({ name, categoryName, categoryParentName });
    }
  }

  private async getCategoryMembers(categoryName: string): Promise<IWikiCategoryMember[]> {
    const cacheKey = categoryName.toLowerCase();
    const cached = this.categoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const title = encodeURIComponent(`Category:${categoryName}`);
    const url = `${WIKI_ACTION_API}?action=query&list=categorymembers&cmtitle=${title}&cmlimit=50&cmtype=subcat%7Cpage&format=json`;

    let members: IWikiCategoryMember[] = [];
    try {
      const response = await this.get<IWikiCategoryMembersResponse>(url);
      members = response.query?.categorymembers ?? [];
    } catch (err) {
      this.logger.warn(`Failed to fetch Wikipedia category "${categoryName}": ${(err as Error).message}`);
      members = [];
    }

    this.categoryCache.set(cacheKey, { value: members, expiresAt: Date.now() + WikipediaTrendProvider.CATEGORY_CACHE_TTL_MS });
    return members;
  }

  private stripCategoryPrefix(title: string): string {
    return title.replace(/^Category:/, '');
  }

  private async get<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TREND_DISCOVERY_CONSTANTS.HTTP_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { 'User-Agent': TREND_DISCOVERY_CONSTANTS.WIKI_USER_AGENT, Accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (err) {
      const error = err as Error;
      throw new Error(error.name === 'AbortError' ? `Wikimedia request timed out: ${url}` : error.message);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      throw new Error(`Wikimedia request failed: HTTP ${response.status} for ${url}`);
    }

    return (await response.json()) as T;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private daysAgo(days: number): Date {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d;
  }

  private formatDate(d: Date): string {
    return d.toISOString().slice(0, 10).replace(/-/g, '');
  }
}
