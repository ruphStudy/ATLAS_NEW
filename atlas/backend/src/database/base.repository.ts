import { PrismaService } from './prisma.service';

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
 */
export abstract class BaseRepository {
  constructor(protected readonly prisma: PrismaService) {}
}
