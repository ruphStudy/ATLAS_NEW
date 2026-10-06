import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { ICategory } from '../interfaces';

/**
 * CategoryRepository
 *
 * Data access for the generic, provider-agnostic Category tree; no
 * business logic.
 */
@Injectable()
export class CategoryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)['category'] as Record<
      string,
      unknown
    >;
  }

  async create(data: {
    parentId?: string | null;
    name: string;
    slug: string;
    source?: string;
  }): Promise<ICategory> {
    const create = this.model['create'] as (args: unknown) => Promise<unknown>;
    return (await create({ data })) as ICategory;
  }

  async findById(id: string): Promise<ICategory | null> {
    const findUnique = this.model['findUnique'] as (args: unknown) => Promise<unknown>;
    return (await findUnique({ where: { id } })) as ICategory | null;
  }

  async findChildren(parentId: string | null): Promise<ICategory[]> {
    const findMany = this.model['findMany'] as (args: unknown) => Promise<unknown[]>;
    return (await findMany({ where: { parentId } })) as ICategory[];
  }

  /**
   * Upserts on the (parentId, slug) natural key — used by cold-start
   * discovery so re-running against the same seed taxonomy doesn't create
   * duplicate category rows. Implemented as findFirst-then-create rather
   * than a real `upsert()`: Prisma's generated WhereUniqueInput for a
   * compound key with a nullable member (parentId) rejects an explicit
   * `null` at the client-validation layer (confirmed against the live
   * schema, not merely a hypothetical) — findFirst has no such
   * restriction. This carries the same small race window already
   * documented on the `@@unique([parentId, slug])` index itself (Postgres
   * treats NULL as distinct, so it isn't a true DB-enforced guarantee for
   * top-level categories) — acceptable since a single cold-start run
   * executes synchronously, never concurrently, against this method.
   */
  async upsertByName(data: {
    name: string;
    parentId?: string | null;
    source?: string;
  }): Promise<ICategory> {
    const slug = this.slugify(data.name);
    const parentId = data.parentId ?? null;

    const findFirst = this.model['findFirst'] as (args: unknown) => Promise<unknown>;
    const existing = (await findFirst({ where: { parentId, slug } })) as ICategory | null;
    if (existing) return existing;

    const create = this.model['create'] as (args: unknown) => Promise<unknown>;
    return (await create({
      data: { name: data.name, slug, parentId, source: data.source ?? 'MANUAL' },
    })) as ICategory;
  }

  private slugify(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '');
  }
}
