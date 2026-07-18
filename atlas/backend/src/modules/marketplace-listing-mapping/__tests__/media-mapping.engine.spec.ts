import { MediaMappingEngine } from '../engines/media-mapping.engine';
import {
  IUniversalImage,
  IUniversalVideo,
  MarketplaceMediaRequirements,
} from '../interfaces';

const DEFAULT_REQS: MarketplaceMediaRequirements = {
  primaryImage: true,
  minImages: 1,
  maxImages: 5,
  allowedFormats: ['JPEG', 'JPG', 'PNG'],
  maxFileSizeKb: 1000,
  minWidth: 500,
  minHeight: 500,
  videoAllowed: true,
  maxVideos: 2,
  altTextRequired: false,
  variantImagesAllowed: true,
};

function makeImage(overrides: Partial<IUniversalImage> = {}): IUniversalImage {
  return {
    id: 'img1',
    url: 'https://cdn.example.com/img1.jpg',
    altText: 'Product image',
    isPrimary: true,
    position: 1,
    width: 1000,
    height: 1000,
    format: 'JPEG',
    fileSizeKb: 200,
    variantId: null,
    ...overrides,
  };
}

function makeVideo(overrides: Partial<IUniversalVideo> = {}): IUniversalVideo {
  return {
    id: 'vid1',
    url: 'https://cdn.example.com/video.mp4',
    title: 'Product Video',
    durationSeconds: 30,
    ...overrides,
  };
}

describe('MediaMappingEngine', () => {
  let engine: MediaMappingEngine;

  beforeEach(() => {
    engine = new MediaMappingEngine();
  });

  // ── buildMediaPayload ──────────────────────────────────────

  describe('buildMediaPayload()', () => {
    it('maps valid images without modification', () => {
      const result = engine.buildMediaPayload([makeImage()], [], DEFAULT_REQS);
      expect(result.images).toHaveLength(1);
      expect(result.images[0]!.url).toBe('https://cdn.example.com/img1.jpg');
      expect(result.errors).toHaveLength(0);
    });

    it('sorts primary image first', () => {
      const secondary = makeImage({ id: 'img2', isPrimary: false, position: 1 });
      const primary = makeImage({ id: 'img3', isPrimary: true, position: 2 });
      const result = engine.buildMediaPayload([secondary, primary], [], DEFAULT_REQS);
      expect(result.images[0]!.isPrimary).toBe(true);
    });

    it('truncates images exceeding maxImages and adds warning', () => {
      const images = Array.from({ length: 8 }, (_, i) =>
        makeImage({ id: `img${i}`, isPrimary: i === 0, position: i + 1 }),
      );
      const result = engine.buildMediaPayload(images, [], DEFAULT_REQS);
      expect(result.images).toHaveLength(5);
      expect(result.warnings.some((w) => w.message.includes('Truncating'))).toBe(true);
    });

    it('adds error when image count below minImages', () => {
      const result = engine.buildMediaPayload([], [], DEFAULT_REQS);
      expect(result.errors.some((e) => e.message.includes('minimum'))).toBe(true);
    });

    it('adds error when primary image required but absent', () => {
      const noPrimary = makeImage({ isPrimary: false });
      const result = engine.buildMediaPayload([noPrimary], [], DEFAULT_REQS);
      expect(result.errors.some((e) => e.message.includes('Primary image'))).toBe(true);
    });

    it('excludes images with disallowed formats and adds warning', () => {
      const webp = makeImage({ id: 'img2', isPrimary: false, format: 'WEBP' });
      const jpeg = makeImage({ id: 'img3', isPrimary: true, format: 'JPEG' });
      const result = engine.buildMediaPayload([webp, jpeg], [], DEFAULT_REQS);
      expect(result.images.some((i) => i.url === webp.url)).toBe(false);
      expect(result.warnings.some((w) => w.message.includes('WEBP'))).toBe(true);
    });

    it('excludes images exceeding maxFileSizeKb and adds warning', () => {
      const large = makeImage({ id: 'large', fileSizeKb: 5000 });
      const small = makeImage({ id: 'small', isPrimary: true, fileSizeKb: 100 });
      const result = engine.buildMediaPayload([large, small], [], DEFAULT_REQS);
      expect(result.images.some((i) => i.url === large.url)).toBe(false);
      expect(result.warnings.some((w) => w.message.includes('size'))).toBe(true);
    });

    it('excludes images below minWidth/minHeight and adds warning', () => {
      const tiny = makeImage({ id: 'tiny', width: 100, height: 100, isPrimary: false });
      const good = makeImage({ id: 'good', isPrimary: true });
      const result = engine.buildMediaPayload([tiny, good], [], DEFAULT_REQS);
      expect(result.images.some((i) => i.url === tiny.url)).toBe(false);
      expect(result.warnings.some((w) => w.message.includes('dimensions'))).toBe(true);
    });

    it('adds warning for missing alt text when required', () => {
      const reqs = { ...DEFAULT_REQS, altTextRequired: true };
      const noAlt = makeImage({ altText: null });
      const result = engine.buildMediaPayload([noAlt], [], reqs);
      expect(result.warnings.some((w) => w.message.includes('alt text'))).toBe(true);
    });
  });

  // ── Video handling ────────────────────────────────────────

  describe('buildMediaPayload() – videos', () => {
    it('excludes videos when videoAllowed=false', () => {
      const reqs = { ...DEFAULT_REQS, videoAllowed: false };
      const result = engine.buildMediaPayload([makeImage()], [makeVideo()], reqs);
      expect(result.videos).toHaveLength(0);
      expect(result.warnings.some((w) => w.message.includes('Videos'))).toBe(true);
    });

    it('truncates videos exceeding maxVideos', () => {
      const videos = [makeVideo(), makeVideo({ id: 'vid2' }), makeVideo({ id: 'vid3' })];
      const result = engine.buildMediaPayload([makeImage()], videos, DEFAULT_REQS);
      expect(result.videos).toHaveLength(2);
      expect(result.warnings.some((w) => w.message.includes('Video count'))).toBe(true);
    });

    it('passes videos unchanged when within limit', () => {
      const result = engine.buildMediaPayload([makeImage()], [makeVideo()], DEFAULT_REQS);
      expect(result.videos).toHaveLength(1);
    });
  });

  // ── detectMissingMedia ────────────────────────────────────

  describe('detectMissingMedia()', () => {
    it('returns missing when no primary image', () => {
      const { missing, reason } = engine.detectMissingMedia(
        [makeImage({ isPrimary: false })],
        DEFAULT_REQS,
      );
      expect(missing).toBe(true);
      expect(reason).toContain('Primary');
    });

    it('returns missing when count below minimum', () => {
      const { missing } = engine.detectMissingMedia([], DEFAULT_REQS);
      expect(missing).toBe(true);
    });

    it('returns not missing for valid images', () => {
      const { missing } = engine.detectMissingMedia([makeImage()], DEFAULT_REQS);
      expect(missing).toBe(false);
    });
  });

  // ── Does not modify originals ─────────────────────────────

  describe('immutability', () => {
    it('does not modify original image objects', () => {
      const original = makeImage({ altText: 'Original Alt' });
      engine.buildMediaPayload([original], [], DEFAULT_REQS);
      expect(original.altText).toBe('Original Alt');
    });
  });
});
