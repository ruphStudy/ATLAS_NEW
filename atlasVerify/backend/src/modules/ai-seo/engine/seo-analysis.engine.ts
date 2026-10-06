import { Injectable } from '@nestjs/common';
import {
  DuplicateContentResult,
  KeywordDensityResult,
  OptimizedContent,
  ReadabilityResult,
  SearchIntent,
  SeoAnalysis,
  SeoRecommendation,
  SeoSection,
} from '../interfaces';

@Injectable()
export class SeoAnalysisEngine {
  /**
   * Calculates SEO Score (0–100) and full analysis:
   *   - Keyword density analysis  (25%)
   *   - Readability score         (25%)
   *   - Duplicate content check   (20%)
   *   - Section coverage          (30%)
   */
  analyze(
    content: OptimizedContent,
    targetKeywords: string[],
    requestedSections: SeoSection[],
  ): SeoAnalysis {
    const fullText = this.extractFullText(content);
    const keywordDensity = this.analyzeKeywordDensity(fullText, targetKeywords);
    const readability = this.analyzeReadability(fullText);
    const duplicateContent = this.analyzeDuplicateContent(content);
    const coverage = this.analyzeCoverage(content, requestedSections);
    const searchIntent = this.detectSearchIntent(targetKeywords, fullText);
    const recommendations = this.generateRecommendations(content, keywordDensity, readability, coverage);

    const seoScore = Math.round(
      this.keywordDensityScore(keywordDensity, targetKeywords) * 0.25 +
      readability.score * 0.25 +
      (duplicateContent.isDuplicate ? 50 : 100) * 0.20 +
      coverage * 0.30,
    );

    return {
      keywordDensity,
      readability,
      duplicateContent,
      searchIntent,
      seoScore: Math.max(0, Math.min(100, seoScore)),
      recommendations,
    };
  }

  private extractFullText(content: OptimizedContent): string {
    return [
      content.productTitle ?? '',
      content.description ?? '',
      ...(content.bulletPoints ?? []),
      ...(content.searchKeywords ?? []),
      ...(content.backendSearchTerms ?? []),
      ...(content.brandKeywords ?? []),
      ...(content.categoryKeywords ?? []),
      ...(content.longTailKeywords ?? []),
    ].join(' ').toLowerCase();
  }

  private analyzeKeywordDensity(
    text: string,
    targetKeywords: string[],
  ): KeywordDensityResult[] {
    const wordCount = text.split(/\s+/).filter(Boolean).length || 1;
    return targetKeywords.map((keyword) => {
      const regex = new RegExp(`\\b${keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = text.match(regex) ?? [];
      const occurrences = matches.length;
      return {
        keyword,
        occurrences,
        density: Math.round((occurrences / wordCount) * 10000) / 100,
      };
    });
  }

  private analyzeReadability(text: string): ReadabilityResult {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter(Boolean);
    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0;
    const complexWords = words.filter((w) => w.length > 8).length;
    const complexWordRatio = words.length > 0 ? complexWords / words.length : 0;

    // Flesch-Kincaid simplified
    const score = Math.max(0, Math.min(100, 100 - avgSentenceLength * 1.5 - complexWordRatio * 30));

    return {
      score: Math.round(score),
      gradeLevel: score >= 80 ? '6th' : score >= 60 ? '8th' : score >= 40 ? '10th' : '12th+',
      avgSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      complexWordRatio: Math.round(complexWordRatio * 1000) / 10,
    };
  }

  private analyzeDuplicateContent(content: OptimizedContent): DuplicateContentResult {
    // Simplified: check if bullet points are very similar to each other
    const bullets = content.bulletPoints ?? [];
    if (bullets.length < 2) {
      return { isDuplicate: false, duplicateRatio: 0 };
    }

    let duplicatePairs = 0;
    for (let i = 0; i < bullets.length; i++) {
      for (let j = i + 1; j < bullets.length; j++) {
        const similarity = this.jaccardSimilarity(bullets[i], bullets[j]);
        if (similarity > 0.7) duplicatePairs++;
      }
    }
    const totalPairs = (bullets.length * (bullets.length - 1)) / 2;
    const duplicateRatio = totalPairs > 0 ? duplicatePairs / totalPairs : 0;

    return {
      isDuplicate: duplicateRatio > 0.3,
      duplicateRatio: Math.round(duplicateRatio * 100) / 100,
    };
  }

  private jaccardSimilarity(a: string, b: string): number {
    const setA = new Set(a.toLowerCase().split(/\s+/));
    const setB = new Set(b.toLowerCase().split(/\s+/));
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private analyzeCoverage(content: OptimizedContent, requestedSections: SeoSection[]): number {
    if (requestedSections.length === 0) return 100;
    let filled = 0;
    for (const section of requestedSections) {
      if (this.isSectionFilled(content, section)) filled++;
    }
    return (filled / requestedSections.length) * 100;
  }

  private isSectionFilled(content: OptimizedContent, section: SeoSection): boolean {
    switch (section) {
      case SeoSection.PRODUCT_TITLE: return !!content.productTitle?.trim();
      case SeoSection.BULLET_POINTS: return (content.bulletPoints?.length ?? 0) > 0;
      case SeoSection.DESCRIPTION: return !!content.description?.trim();
      case SeoSection.BACKEND_SEARCH_TERMS: return (content.backendSearchTerms?.length ?? 0) > 0;
      case SeoSection.SEARCH_KEYWORDS: return (content.searchKeywords?.length ?? 0) > 0;
      case SeoSection.BRAND_KEYWORDS: return (content.brandKeywords?.length ?? 0) > 0;
      case SeoSection.CATEGORY_KEYWORDS: return (content.categoryKeywords?.length ?? 0) > 0;
      case SeoSection.LONG_TAIL_KEYWORDS: return (content.longTailKeywords?.length ?? 0) > 0;
      case SeoSection.IMAGE_ALT_TEXT: return (content.imageAltText?.length ?? 0) > 0;
      default: return false;
    }
  }

  private detectSearchIntent(keywords: string[], text: string): SearchIntent {
    const buyWords = ['buy', 'purchase', 'order', 'shop', 'deal', 'price', 'cheap', 'discount'];
    const compareWords = ['best', 'top', 'review', 'vs', 'compare', 'alternative'];
    const infoWords = ['how', 'what', 'why', 'guide', 'tutorial', 'learn'];

    const combined = [...keywords, text].join(' ').toLowerCase();
    const buyCount = buyWords.filter((w) => combined.includes(w)).length;
    const compareCount = compareWords.filter((w) => combined.includes(w)).length;
    const infoCount = infoWords.filter((w) => combined.includes(w)).length;

    if (buyCount >= compareCount && buyCount >= infoCount) return SearchIntent.TRANSACTIONAL;
    if (compareCount >= infoCount) return SearchIntent.COMMERCIAL;
    if (infoCount > 0) return SearchIntent.INFORMATIONAL;
    return SearchIntent.TRANSACTIONAL;
  }

  private keywordDensityScore(results: KeywordDensityResult[], targetKeywords: string[]): number {
    if (targetKeywords.length === 0) return 80;
    const present = results.filter((r) => r.occurrences > 0).length;
    const coverageScore = (present / targetKeywords.length) * 60;

    // Penalize keyword stuffing (>5% density)
    const stuffed = results.filter((r) => r.density > 5).length;
    const stuffingPenalty = stuffed * 10;

    return Math.max(0, coverageScore + 40 - stuffingPenalty);
  }

  private generateRecommendations(
    content: OptimizedContent,
    keywordDensity: KeywordDensityResult[],
    readability: ReadabilityResult,
    coverage: number,
  ): SeoRecommendation[] {
    const recommendations: SeoRecommendation[] = [];

    if (!content.productTitle || content.productTitle.length < 40) {
      recommendations.push({
        section: SeoSection.PRODUCT_TITLE,
        issue: 'Product title is too short',
        suggestion: 'Aim for 60–200 characters including primary keyword',
        priority: 'HIGH',
      });
    }

    if ((content.bulletPoints?.length ?? 0) < 5) {
      recommendations.push({
        section: SeoSection.BULLET_POINTS,
        issue: 'Fewer than 5 bullet points',
        suggestion: 'Add 5–7 bullet points highlighting key features and benefits',
        priority: 'HIGH',
      });
    }

    const missingKeywords = keywordDensity.filter((k) => k.occurrences === 0);
    if (missingKeywords.length > 0) {
      recommendations.push({
        section: SeoSection.SEARCH_KEYWORDS,
        issue: `${missingKeywords.length} target keyword(s) not found in content`,
        suggestion: `Incorporate: ${missingKeywords.slice(0, 3).map((k) => k.keyword).join(', ')}`,
        priority: 'MEDIUM',
      });
    }

    if (readability.score < 60) {
      recommendations.push({
        section: SeoSection.DESCRIPTION,
        issue: 'Low readability score',
        suggestion: 'Use shorter sentences and simpler language for better customer comprehension',
        priority: 'MEDIUM',
      });
    }

    if ((content.backendSearchTerms?.length ?? 0) === 0) {
      recommendations.push({
        section: SeoSection.BACKEND_SEARCH_TERMS,
        issue: 'No backend search terms',
        suggestion: 'Add 200–250 characters of backend search terms for improved discoverability',
        priority: 'HIGH',
      });
    }

    return recommendations;
  }
}
