import { generateUUID } from '@common/utils';
import { PrismaService } from './prisma.service';

interface ICacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * BaseRepository – Abstract base for all domain repositories.
 *
 * Architecture Rule:
 * - Repositories are the ONLY layer that accesses PrismaService.
 * - Business logic must NOT live in repositories.
 * - Repositories are injected into Services, never into Controllers.
 *
 * Usage:
 *   @Injectable()
 *   export class UserRepository extends BaseRepository {
 *     constructor(prisma: PrismaService) { super(prisma); }
 *   }
 *
 * Caching:
 * - getFromCache/setCache/invalidateCachePattern provide a lightweight,
 *   in-process TTL cache shared by all repositories (keys are expected to
 *   be namespaced by the caller, e.g. `warehouse:performance:${workspaceId}:...`).
 * - Backed by a single static store so analytics-style repositories across
 *   modules share one cache without each needing its own implementation.
 */
export abstract class BaseRepository {
  private static readonly cacheStore = new Map<string, ICacheEntry>();

  constructor(protected readonly prisma: PrismaService) {}

  protected generateId(): string {
    return generateUUID();
  }

  protected async getFromCache<T>(key: string): Promise<T | null> {
    const entry = BaseRepository.cacheStore.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      BaseRepository.cacheStore.delete(key);
      return null;
    }

    return entry.value as T;
  }

  protected async setCache(key: string, data: unknown, ttlMinutes: number): Promise<void> {
    BaseRepository.cacheStore.set(key, {
      value: data,
      expiresAt: Date.now() + ttlMinutes * 60 * 1000,
    });
  }

  protected async invalidateCachePattern(pattern: string): Promise<number> {
    const regex = new RegExp(
      `^${pattern
        .split('*')
        .map((segment) => segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')}$`,
    );

    let count = 0;
    for (const key of BaseRepository.cacheStore.keys()) {
      if (regex.test(key)) {
        BaseRepository.cacheStore.delete(key);
        count++;
      }
    }
    return count;
  }
}
