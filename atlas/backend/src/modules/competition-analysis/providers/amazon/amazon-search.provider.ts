import { Injectable, Logger } from '@nestjs/common';
import {
  ICompetitionProvider,
  CompetitionProvider,
  CompetitionProviderOptions,
  CompetitionAnalysisData,
  RatingDistribution,
  ReviewDistribution,
  BrandDominance,
  SellerTypeBreakdown,
  ListingQuality,
  KeywordCompetition,
} from '../../interfaces';

/**
 * Amazon Search Competition Provider
 *
 * Metadata-driven provider that analyzes competition via Amazon search results.
 * Implements the ICompetitionProvider contract.
 *
 * NOTE: The actual HTTP scraping / SP-API integration is a separate infrastructure
 * concern. This provider contains the scoring and transformation logic; raw data
 * is expected to be fetched by an injected HTTP adapter (stub for now).
 */
@Injectable()
export class AmazonSearchProvider implements ICompetitionProvider {
  readonly providerName = CompetitionProvider.AMAZON_SEARCH;
  private readonly logger = new Logger(AmazonSearchProvider.name);

  isAvailable(): boolean {
    return true;
  }

  async analyze(options: CompetitionProviderOptions): Promise<CompetitionAnalysisData> {
    this.logger.log(
      `Running Amazon Search analysis for keyword="${options.keyword}" marketplace="${options.marketplace}"`,
    );

    // Fetch raw listings from Amazon search results
    const rawListings = await this.fetchListings(options);

    const competitorCount = rawListings.length;
    const prices = rawListings.map((l) => l.price).filter((p) => p > 0);
    const averagePrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const priceRange = maxPrice - minPrice;

    const ratingDistribution = this.buildRatingDistribution(rawListings);
    const reviewDistribution = this.buildReviewDistribution(rawListings);
    const brandDominance = this.buildBrandDominance(rawListings);
    const sellerTypeBreakdown = this.buildSellerTypeBreakdown(rawListings);
    const listingQuality = this.buildListingQuality(rawListings);
    const keywordCompetition = this.buildKeywordCompetition(rawListings);

    const competitionScore = this.calculateScore({
      competitorCount,
      averagePrice,
      ratingDistribution,
      reviewDistribution,
      brandDominance,
      sellerTypeBreakdown,
      listingQuality,
      keywordCompetition,
    });

    return {
      competitorCount,
      averagePrice,
      minPrice,
      maxPrice,
      priceRange,
      ratingDistribution,
      reviewDistribution,
      brandDominance,
      sellerTypeBreakdown,
      listingQuality,
      keywordCompetition,
      competitionScore,
      rawData: { listings: rawListings, options },
    };
  }

  // ── Private: data fetch stub ─────────────────────────────────

  private async fetchListings(options: CompetitionProviderOptions): Promise<AmazonListing[]> {
    // TODO: Replace with real Amazon SP-API / scraper integration
    // The returned structure mirrors Amazon search result items.
    this.logger.debug(`Fetching listings for "${options.keyword}" (stub)`);
    return this.generateStubListings(options.keyword);
  }

  // ── Private: metric builders ─────────────────────────────────

  private buildRatingDistribution(listings: AmazonListing[]): RatingDistribution {
    const counts = [0, 0, 0, 0, 0];

    for (const l of listings) {
      const rounded = Math.round(l.rating);
      if (rounded >= 1 && rounded <= 5) {
        counts[rounded - 1]++;
      }
    }

    const totalRatings = counts.reduce((a, b) => a + b, 0);
    const weightedSum = counts.reduce((sum, count, idx) => sum + count * (idx + 1), 0);
    const averageRating = totalRatings > 0 ? weightedSum / totalRatings : 0;

    return {
      oneStarCount: counts[0],
      twoStarCount: counts[1],
      threeStarCount: counts[2],
      fourStarCount: counts[3],
      fiveStarCount: counts[4],
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings,
    };
  }

  private buildReviewDistribution(listings: AmazonListing[]): ReviewDistribution {
    const reviewCounts = listings.map((l) => l.reviewCount);
    const noReviews = reviewCounts.filter((r) => r === 0).length;
    const low = reviewCounts.filter((r) => r > 0 && r <= 50).length;
    const medium = reviewCounts.filter((r) => r > 50 && r <= 500).length;
    const high = reviewCounts.filter((r) => r > 500).length;

    const total = reviewCounts.reduce((a, b) => a + b, 0);
    const average = listings.length > 0 ? total / listings.length : 0;

    const sorted = [...reviewCounts].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length > 0
      ? sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2
      : 0;

    return {
      noReviewsCount: noReviews,
      lowReviewsCount: low,
      mediumReviewsCount: medium,
      highReviewsCount: high,
      averageReviewCount: Math.round(average),
      medianReviewCount: Math.round(median),
    };
  }

  private buildBrandDominance(listings: AmazonListing[]): BrandDominance {
    const brandMap = new Map<string, number>();

    for (const l of listings) {
      const brand = l.brand || 'Unknown';
      brandMap.set(brand, (brandMap.get(brand) ?? 0) + 1);
    }

    const sorted = [...brandMap.entries()].sort((a, b) => b[1] - a[1]);
    const total = listings.length || 1;

    const topBrands = sorted.slice(0, 10).map(([brand, count]) => ({
      brand,
      listingCount: count,
      percentage: Math.round((count / total) * 1000) / 10,
    }));

    const topThreeCount = sorted.slice(0, 3).reduce((sum, [, count]) => sum + count, 0);
    const topBrandConcentration = Math.round((topThreeCount / total) * 1000) / 10;

    return {
      topBrands,
      topBrandConcentration,
      isBrandDominated: topBrandConcentration >= 50,
    };
  }

  private buildSellerTypeBreakdown(listings: AmazonListing[]): SellerTypeBreakdown {
    const fba = listings.filter((l) => l.sellerType === 'FBA').length;
    const fbm = listings.filter((l) => l.sellerType === 'FBM').length;
    const amazon = listings.filter((l) => l.sellerType === 'AMAZON').length;
    const total = listings.length || 1;

    return {
      fbaCount: fba,
      fbmCount: fbm,
      amazonCount: amazon,
      fbaPercentage: Math.round((fba / total) * 1000) / 10,
      fbmPercentage: Math.round((fbm / total) * 1000) / 10,
      amazonPercentage: Math.round((amazon / total) * 1000) / 10,
    };
  }

  private buildListingQuality(listings: AmazonListing[]): ListingQuality {
    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const pct = (count: number) => listings.length ? Math.round((count / listings.length) * 1000) / 10 : 0;

    const titleLengths = listings.map((l) => l.titleLength);
    const bulletCounts = listings.map((l) => l.bulletPointCount);
    const imageCounts = listings.map((l) => l.imageCount);
    const aPlusCount = listings.filter((l) => l.hasAPlus).length;
    const videoCount = listings.filter((l) => l.hasVideo).length;

    // Compute a holistic quality score (0–100)
    const avgTitle = avg(titleLengths);
    const avgBullets = avg(bulletCounts);
    const avgImages = avg(imageCounts);
    const aPlusPct = pct(aPlusCount);
    const videoPct = pct(videoCount);

    const qualityScore = Math.min(
      100,
      (Math.min(avgTitle, 200) / 200) * 20 +
        (Math.min(avgBullets, 5) / 5) * 25 +
        (Math.min(avgImages, 9) / 9) * 25 +
        (aPlusPct / 100) * 20 +
        (videoPct / 100) * 10,
    );

    return {
      avgTitleLength: Math.round(avg(titleLengths)),
      avgBulletPoints: Math.round(avg(bulletCounts) * 10) / 10,
      avgImageCount: Math.round(avg(imageCounts) * 10) / 10,
      aPlusContentPercentage: aPlusPct,
      videoPercentage: videoPct,
      qualityScore: Math.round(qualityScore * 10) / 10,
    };
  }

  private buildKeywordCompetition(listings: AmazonListing[]): KeywordCompetition {
    const sponsored = listings.filter((l) => l.isSponsored).length;
    const organic = listings.length - sponsored;
    const sponsoredPct = listings.length
      ? Math.round((sponsored / listings.length) * 1000) / 10
      : 0;

    let competitionLevel: KeywordCompetition['competitionLevel'];
    if (sponsoredPct >= 60) competitionLevel = 'VERY_HIGH';
    else if (sponsoredPct >= 40) competitionLevel = 'HIGH';
    else if (sponsoredPct >= 20) competitionLevel = 'MEDIUM';
    else competitionLevel = 'LOW';

    return {
      sponsoredListingCount: sponsored,
      organicListingCount: organic,
      sponsoredPercentage: sponsoredPct,
      competitionLevel,
    };
  }

  // ── Private: score calculation ───────────────────────────────

  private calculateScore(metrics: {
    competitorCount: number;
    averagePrice: number;
    ratingDistribution: RatingDistribution;
    reviewDistribution: ReviewDistribution;
    brandDominance: BrandDominance;
    sellerTypeBreakdown: SellerTypeBreakdown;
    listingQuality: ListingQuality;
    keywordCompetition: KeywordCompetition;
  }): number {
    // Higher score = more competitive (harder market)
    const competitorScore = Math.min(100, (metrics.competitorCount / 100) * 100);

    const reviewScore = Math.min(
      100,
      (metrics.reviewDistribution.highReviewsCount / Math.max(1, metrics.competitorCount)) * 100,
    );

    const brandScore = metrics.brandDominance.topBrandConcentration;

    const fbaScore = metrics.sellerTypeBreakdown.fbaPercentage;

    const keywordScore =
      metrics.keywordCompetition.competitionLevel === 'VERY_HIGH'
        ? 100
        : metrics.keywordCompetition.competitionLevel === 'HIGH'
          ? 75
          : metrics.keywordCompetition.competitionLevel === 'MEDIUM'
            ? 50
            : 25;

    const listingScore = metrics.listingQuality.qualityScore;

    const ratingScore = (metrics.ratingDistribution.averageRating / 5) * 100;

    const avgReviewScore = Math.min(100, (metrics.reviewDistribution.averageReviewCount / 1000) * 100);

    const weightedScore =
      competitorScore * 0.20 +
      avgReviewScore * 0.15 +
      reviewScore * 0.15 +
      brandScore * 0.15 +
      fbaScore * 0.10 +
      listingScore * 0.10 +
      keywordScore * 0.05 +
      ratingScore * 0.10;

    return Math.round(Math.min(100, Math.max(0, weightedScore)) * 10) / 10;
  }

  // ── Private: stub data generation ───────────────────────────

  private generateStubListings(keyword: string): AmazonListing[] {
    const sellerTypes: Array<'FBA' | 'FBM' | 'AMAZON'> = ['FBA', 'FBA', 'FBA', 'FBM', 'AMAZON'];
    const brands = ['BrandA', 'BrandB', 'BrandC', 'BrandD', 'Generic'];
    const count = 40 + Math.floor(Math.random() * 40);

    return Array.from({ length: count }, (_, i) => ({
      asin: `B${String(i).padStart(9, '0')}`,
      title: `${keyword} Product ${i + 1} Premium Quality Best Seller`,
      titleLength: 60 + Math.floor(Math.random() * 100),
      price: 10 + Math.random() * 100,
      rating: 3 + Math.random() * 2,
      reviewCount: Math.floor(Math.random() ** 2 * 2000),
      brand: brands[Math.floor(Math.random() * brands.length)],
      sellerType: sellerTypes[Math.floor(Math.random() * sellerTypes.length)],
      isSponsored: Math.random() < 0.35,
      bulletPointCount: 3 + Math.floor(Math.random() * 3),
      imageCount: 3 + Math.floor(Math.random() * 7),
      hasAPlus: Math.random() < 0.4,
      hasVideo: Math.random() < 0.2,
    }));
  }
}

// ── Internal listing shape ───────────────────────────────────

interface AmazonListing {
  asin: string;
  title: string;
  titleLength: number;
  price: number;
  rating: number;
  reviewCount: number;
  brand: string;
  sellerType: 'FBA' | 'FBM' | 'AMAZON';
  isSponsored: boolean;
  bulletPointCount: number;
  imageCount: number;
  hasAPlus: boolean;
  hasVideo: boolean;
}
