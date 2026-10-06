import 'reflect-metadata';
import { WikipediaTrendProvider } from '../providers/wikipedia-trend.provider';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

function pageviewSeries(views: number[]): { items: { article: string; timestamp: string; views: number }[] } {
  return {
    items: views.map((v, i) => ({ article: 'X', timestamp: `2026080${i + 1}00`, views: v })),
  };
}

describe('WikipediaTrendProvider', () => {
  let provider: WikipediaTrendProvider;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    provider = new WikipediaTrendProvider();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => jest.clearAllMocks());

  describe('discoverConcepts()', () => {
    it('uses the official MediaWiki Action API category-members endpoint with a descriptive User-Agent', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ query: { categorymembers: [] } }));

      await provider.discoverConcepts(['Consumer electronics'], 1);

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('en.wikipedia.org/w/api.php');
      expect(url).toContain('list=categorymembers');
      expect((options.headers as Record<string, string>)['User-Agent']).toContain('ATLAS-TrendDiscovery');
    });

    it('returns real article titles (ns:0) as candidates, never fabricated names', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          query: {
            categorymembers: [
              { pageid: 1, ns: 0, title: 'Smartwatch' },
              { pageid: 2, ns: 14, title: 'Category:Wearable devices' },
            ],
          },
        }),
      );

      const candidates = await provider.discoverConcepts(['Consumer electronics'], 1);

      expect(candidates).toEqual([
        { name: 'Smartwatch', categoryName: 'Consumer electronics', categoryParentName: null },
      ]);
    });

    it('walks one subcategory level deeper when maxLevels is 2', async () => {
      fetchMock
        .mockResolvedValueOnce(
          jsonResponse({
            query: { categorymembers: [{ pageid: 2, ns: 14, title: 'Category:Wearable devices' }] },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({ query: { categorymembers: [{ pageid: 3, ns: 0, title: 'Smartwatch' }] } }),
        );

      const candidates = await provider.discoverConcepts(['Consumer electronics'], 2);

      expect(candidates).toEqual([
        { name: 'Smartwatch', categoryName: 'Wearable devices', categoryParentName: 'Consumer electronics' },
      ]);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does not walk subcategories when maxLevels is 1', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          query: {
            categorymembers: [
              { pageid: 1, ns: 0, title: 'Smartwatch' },
              { pageid: 2, ns: 14, title: 'Category:Wearable devices' },
            ],
          },
        }),
      );

      await provider.discoverConcepts(['Consumer electronics'], 1);

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('deduplicates the same article found under multiple categories', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ query: { categorymembers: [{ pageid: 1, ns: 0, title: 'Smartwatch' }] } }),
      );

      const candidates = await provider.discoverConcepts(['Consumer electronics', 'Clothing'], 1);

      expect(candidates).toHaveLength(1);
    });

    it('returns an empty list (not an error) when a category fetch fails', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 500));

      const candidates = await provider.discoverConcepts(['Consumer electronics'], 1);

      expect(candidates).toEqual([]);
    });
  });

  describe('getAttentionEvidence()', () => {
    it('computes real growth from the earlier-half vs recent-half average, never a fabricated number', async () => {
      // earlier half avg = 100, recent half avg = 200 -> +100% growth
      fetchMock.mockResolvedValue(jsonResponse(pageviewSeries([100, 100, 100, 100, 200, 200, 200, 200])));

      const evidence = await provider.getAttentionEvidence('Smartwatch');

      expect(evidence).not.toBeNull();
      expect(evidence?.value).toBe(100);
      expect(evidence?.unit).toBe('percent_change_30d');
      expect(evidence?.rawPayload['earlierAvgDailyViews']).toBe(100);
      expect(evidence?.rawPayload['recentAvgDailyViews']).toBe(200);
    });

    it('returns null (never 0-as-real) when Wikimedia has no pageview history for the article', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, false, 404));

      const evidence = await provider.getAttentionEvidence('Some Obscure Article');

      expect(evidence).toBeNull();
    });

    it('returns null when there is too little real data to compute an honest trend', async () => {
      fetchMock.mockResolvedValue(jsonResponse(pageviewSeries([10, 20])));

      const evidence = await provider.getAttentionEvidence('Smartwatch');

      expect(evidence).toBeNull();
    });

    it('returns null instead of Infinity/NaN when the earlier-half baseline is zero', async () => {
      fetchMock.mockResolvedValue(jsonResponse(pageviewSeries([0, 0, 0, 0, 50, 50, 50, 50])));

      const evidence = await provider.getAttentionEvidence('Smartwatch');

      expect(evidence).toBeNull();
    });

    it('replaces spaces with underscores in the article URL segment', async () => {
      fetchMock.mockResolvedValue(jsonResponse(pageviewSeries([10, 10, 10, 10])));

      await provider.getAttentionEvidence('Air source heat pump');

      const [url] = fetchMock.mock.calls[0] as [string];
      expect(url).toContain('Air_source_heat_pump');
    });
  });
});
