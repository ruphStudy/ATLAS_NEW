import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { IProductConcept } from '../interfaces';

/**
 * ProductConceptRepository
 *
 * Canonical identity is (categoryId, normalizedName); global/shared, not
 * workspace-scoped (Prompt 3 §5.A).
 */
@Injectable()
export class ProductConceptRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)['productConcept'] as Record<
      string,
      unknown
    >;
  }

  /**
   * Upserts on the (categoryId, normalizedName) natural key. Implemented
   * as findFirst-then-create rather than a real `upsert()` — Prisma's
   * generated WhereUniqueInput for a compound key with a nullable member
   * (categoryId) rejects an explicit `null` (confirmed live against this
   * schema); findFirst has no such restriction. See the identical note on
   * CategoryRepository.upsertByName for the accepted race-window caveat.
   */
  async upsert(data: {
    categoryId?: string | null;
    name: string;
    createdFrom?: string;
  }): Promise<IProductConcept> {
    const normalizedName = data.name.trim().toLowerCase();
    const categoryId = data.categoryId ?? null;

    const findFirst = this.model['findFirst'] as (args: unknown) => Promise<unknown>;
    const existing = (await findFirst({ where: { categoryId, normalizedName } })) as IProductConcept | null;
    if (existing) return existing;

    const create = this.model['create'] as (args: unknown) => Promise<unknown>;
    return (await create({
      data: { categoryId, name: data.name, normalizedName, createdFrom: data.createdFrom ?? 'MANUAL' },
    })) as IProductConcept;
  }

  async findById(id: string): Promise<IProductConcept | null> {
    const findUnique = this.model['findUnique'] as (args: unknown) => Promise<unknown>;
    return (await findUnique({ where: { id } })) as IProductConcept | null;
  }
}
