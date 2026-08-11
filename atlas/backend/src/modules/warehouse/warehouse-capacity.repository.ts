import { Injectable } from '@nestjs/core';
import { PrismaService } from '@database/prisma.service';
import { BaseRepository } from '@database/base.repository';
import { CapacityLevel, CapacityMeasure } from './interfaces';

@Injectable()
export class WarehouseCapacityRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseCapacityReservation'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  async createReservation(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  async findActiveReservations(
    level: CapacityLevel,
    entityId: string,
    measure: CapacityMeasure,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: {
        level,
        entityId,
        measure,
        releasedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    });
  }

  async findByReference(
    referenceType: string,
    referenceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: {
        referenceType,
        referenceId,
        releasedAt: null,
      },
    });
  }

  async releaseByReference(referenceType: string, referenceId: string): Promise<number> {
    const result = await this.call<{ count: number }>('updateMany', {
      where: {
        referenceType,
        referenceId,
        releasedAt: null,
      },
      data: {
        releasedAt: new Date(),
      },
    });
    return result.count;
  }

  async releaseExpired(): Promise<number> {
    const result = await this.call<{ count: number }>('updateMany', {
      where: {
        expiresAt: { lt: new Date() },
        releasedAt: null,
      },
      data: {
        releasedAt: new Date(),
      },
    });
    return result.count;
  }

  async getTotalReserved(
    level: CapacityLevel,
    entityId: string,
    measure: CapacityMeasure,
  ): Promise<number> {
    const result = await this.call<{ _sum: { quantity: number | null } }>('aggregate', {
      where: {
        level,
        entityId,
        measure,
        releasedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      _sum: {
        quantity: true,
      },
    });
    return result._sum.quantity ?? 0;
  }
}
