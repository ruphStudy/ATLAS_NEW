import { ContentRuleEngine } from '../engines/content-rule.engine';
import { MarketplaceContentRules } from '../interfaces';

const DEFAULT_RULES: MarketplaceContentRules = {
  maxTitleLength: 80,
  maxBulletPoints: 5,
  maxBulletLength: 200,
  maxDescriptionLength: 2000,
  htmlInDescription: false,
  maxSearchTerms: 5,
  maxSearchTermLength: 50,
  allowCapitalization: true,
  allowPromotionalText: true,
  allowSpecialChars: true,
  brandInTitle: false,
};

describe('ContentRuleEngine', () => {
  let engine: ContentRuleEngine;

  beforeEach(() => {
    engine = new ContentRuleEngine();
  });

  // ── Title Processing ──────────────────────────────────────

  describe('applyRules() – title', () => {
    it('passes title within limit unchanged', () => {
      const result = engine.applyRules({ title: 'Short Title' }, DEFAULT_RULES);
      expect(result.title).toBe('Short Title');
      expect(result.warnings).toHaveLength(0);
    });

    it('truncates title exceeding maxTitleLength and adds warning', () => {
      const longTitle = 'A'.repeat(100);
      const result = engine.applyRules({ title: longTitle }, DEFAULT_RULES);
      expect(result.title!.length).toBe(80);
      expect(result.warnings.some((w) => w.field === 'title')).toBe(true);
    });

    it('prepends brand when brandInTitle=true and brand absent from title', () => {
      const rules = { ...DEFAULT_RULES, brandInTitle: true };
      const result = engine.applyRules({ title: 'Laptop 15"', brand: 'Sony' }, rules);
      expect(result.title!.startsWith('Sony')).toBe(true);
    });

    it('does not duplicate brand if already in title', () => {
      const rules = { ...DEFAULT_RULES, brandInTitle: true };
      const result = engine.applyRules({ title: 'Sony Laptop 15"', brand: 'Sony' }, rules);
      const sonCount = (result.title!.toLowerCase().match(/sony/g) ?? []).length;
      expect(sonCount).toBe(1);
    });

    it('removes special characters when allowSpecialChars=false', () => {
      const rules = { ...DEFAULT_RULES, allowSpecialChars: false };
      const result = engine.applyRules({ title: 'Title @#$ End' }, rules);
      expect(result.title).not.toMatch(/[@#$]/);
    });

    it('returns null for missing title', () => {
      const result = engine.applyRules({}, DEFAULT_RULES);
      expect(result.title).toBeNull();
    });
  });

  // ── Description Processing ────────────────────────────────

  describe('applyRules() – description', () => {
    it('strips HTML when htmlInDescription=false', () => {
      const result = engine.applyRules(
        { description: '<p>Hello <b>World</b></p>' },
        DEFAULT_RULES,
      );
      expect(result.description).not.toContain('<');
      expect(result.description).toContain('Hello');
    });

    it('preserves HTML when htmlInDescription=true', () => {
      const rules = { ...DEFAULT_RULES, htmlInDescription: true };
      const result = engine.applyRules({ description: '<p>Hello</p>' }, rules);
      expect(result.description).toContain('<p>');
    });

    it('truncates description and adds warning', () => {
      const rules = { ...DEFAULT_RULES, maxDescriptionLength: 50 };
      const result = engine.applyRules({ description: 'D'.repeat(100) }, rules);
      expect(result.description!.length).toBe(50);
      expect(result.warnings.some((w) => w.field === 'description')).toBe(true);
    });
  });

  // ── Bullet Points ─────────────────────────────────────────

  describe('applyRules() – bulletPoints', () => {
    it('truncates bullet count and adds warning', () => {
      const rules = { ...DEFAULT_RULES, maxBulletPoints: 3 };
      const bullets = ['A', 'B', 'C', 'D', 'E'];
      const result = engine.applyRules({ bulletPoints: bullets }, rules);
      expect(result.bulletPoints).toHaveLength(3);
      expect(result.warnings.some((w) => w.field === 'bulletPoints')).toBe(true);
    });

    it('truncates individual bullet exceeding maxBulletLength', () => {
      const rules = { ...DEFAULT_RULES, maxBulletLength: 10 };
      const result = engine.applyRules({ bulletPoints: ['Short', 'This is a very long bullet point'] }, rules);
      expect(result.bulletPoints[1]!.length).toBe(10);
    });
  });

  // ── Search Terms ──────────────────────────────────────────

  describe('applyRules() – searchTerms', () => {
    it('truncates search term count', () => {
      const rules = { ...DEFAULT_RULES, maxSearchTerms: 2 };
      const result = engine.applyRules({ searchTerms: ['a', 'b', 'c', 'd'] }, rules);
      expect(result.searchTerms).toHaveLength(2);
    });

    it('truncates individual search term length', () => {
      const rules = { ...DEFAULT_RULES, maxSearchTermLength: 10 };
      const result = engine.applyRules({ searchTerms: ['short', 'this is a very long term'] }, rules);
      expect(result.searchTerms[1]!.length).toBe(10);
    });
  });

  // ── Restricted Words / Prohibited Claims ──────────────────

  describe('restricted words', () => {
    it('adds error when content contains restricted word', () => {
      const rules = { ...DEFAULT_RULES, restrictedWords: ['cheapest', 'free'] };
      const result = engine.applyRules(
        { title: 'Buy the cheapest item', description: 'Great product' },
        rules,
      );
      expect(result.errors.some((e) => e.message.includes('cheapest'))).toBe(true);
    });
  });

  describe('prohibited claims', () => {
    it('adds error when content contains prohibited claim', () => {
      const rules = { ...DEFAULT_RULES, prohibitedClaims: ['cures cancer', 'guaranteed'] };
      const result = engine.applyRules(
        { description: 'This product guaranteed results' },
        rules,
      );
      expect(result.errors.some((e) => e.message.includes('guaranteed'))).toBe(true);
    });
  });

  // ── validateContent() ─────────────────────────────────────

  describe('validateContent()', () => {
    it('returns empty issues for valid content', () => {
      const issues = engine.validateContent(
        { title: 'Valid Title', description: 'Valid description' },
        DEFAULT_RULES,
      );
      expect(issues).toHaveLength(0);
    });

    it('returns error for title exceeding max length', () => {
      const issues = engine.validateContent(
        { title: 'T'.repeat(200) },
        DEFAULT_RULES,
      );
      expect(issues.some((i) => i.field === 'title')).toBe(true);
    });

    it('detects promotional text when not allowed', () => {
      const rules = { ...DEFAULT_RULES, allowPromotionalText: false };
      const issues = engine.validateContent(
        { description: 'Limited time discount 50% off sale' },
        rules,
      );
      expect(issues.some((i) => i.field === 'description')).toBe(true);
    });
  });
});
