import { MarketplaceVersionManager } from '../version/marketplace-version.manager';
import { MarketplaceApiVersion } from '../interfaces';

const v1: MarketplaceApiVersion = { major: 1, minor: 0, patch: 0 };
const v2: MarketplaceApiVersion = { major: 2, minor: 0, patch: 0 };
const v1_5: MarketplaceApiVersion = { major: 1, minor: 5, patch: 0 };

describe('MarketplaceVersionManager', () => {
  let manager: MarketplaceVersionManager;

  beforeEach(() => {
    manager = new MarketplaceVersionManager();
  });

  it('registers and retrieves version record', () => {
    manager.register({
      providerKey: 'AMAZON_SP',
      current: v2,
      supported: [v1, v2],
      deprecated: [v1],
    });
    const record = manager.getRecord('AMAZON_SP');
    expect(record).not.toBeNull();
    expect(record!.current).toEqual(v2);
  });

  it('getCurrentVersion() returns current version', () => {
    manager.register({ providerKey: 'P', current: v2, supported: [v2], deprecated: [] });
    expect(manager.getCurrentVersion('P')).toEqual(v2);
  });

  it('getCurrentVersion() returns null for unregistered provider', () => {
    expect(manager.getCurrentVersion('UNKNOWN')).toBeNull();
  });

  it('isSupported() returns true for supported version', () => {
    manager.register({ providerKey: 'P', current: v2, supported: [v1, v2], deprecated: [] });
    expect(manager.isSupported('P', v1)).toBe(true);
    expect(manager.isSupported('P', v2)).toBe(true);
  });

  it('isSupported() returns false for unsupported version', () => {
    manager.register({ providerKey: 'P', current: v2, supported: [v2], deprecated: [v1] });
    expect(manager.isSupported('P', v1_5)).toBe(false);
  });

  it('isDeprecated() returns true for deprecated version', () => {
    manager.register({ providerKey: 'P', current: v2, supported: [v1, v2], deprecated: [v1] });
    expect(manager.isDeprecated('P', v1)).toBe(true);
    expect(manager.isDeprecated('P', v2)).toBe(false);
  });

  it('meetsMinimum() returns true when no minimum required', () => {
    manager.register({ providerKey: 'P', current: v1, supported: [v1], deprecated: [] });
    expect(manager.meetsMinimum('P')).toBe(true);
  });

  it('meetsMinimum() returns true when current >= minimum', () => {
    manager.register({
      providerKey: 'P', current: v2, supported: [v2], deprecated: [],
      minimumRequired: v1,
    });
    expect(manager.meetsMinimum('P')).toBe(true);
  });

  it('meetsMinimum() returns false when current < minimum', () => {
    manager.register({
      providerKey: 'P', current: v1, supported: [v1], deprecated: [],
      minimumRequired: v2,
    });
    expect(manager.meetsMinimum('P')).toBe(false);
  });

  it('formatVersion() uses label when provided', () => {
    const v: MarketplaceApiVersion = { major: 2024, minor: 10, patch: 1, label: 'v2024-10-01' };
    expect(manager.formatVersion(v)).toBe('v2024-10-01');
  });

  it('formatVersion() formats numeric version', () => {
    expect(manager.formatVersion(v2)).toBe('2.0.0');
  });

  it('getAll() returns all registered records', () => {
    manager.register({ providerKey: 'A', current: v1, supported: [v1], deprecated: [] });
    manager.register({ providerKey: 'B', current: v2, supported: [v2], deprecated: [] });
    expect(manager.getAll()).toHaveLength(2);
  });
});
