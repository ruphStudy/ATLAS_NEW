import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { ITrendSignal, TrendSignalClassification, TrendSignalSubjectType } from '../interfaces';

/**
 * TrendSignalRepository
 *
 * `subjectId` is a polymorphic pointer (see schema.prisma comment on
 * TrendSignal) with no DB-enforced FK — callers are responsible for
 * passing a real, existing Category or ProductConcept id.
 */
@Injectable()
export class TrendSignalRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)['trendSignal'] as Record<
      string,
      unknown
    >;
  }

  async create(data: {
    subjectType: TrendSignalSubjectType;
    subjectId: string;
    signalType: string;
    source: string;
    classification: TrendSignalClassification;
    value?: number | null;
    unit?: string | null;
    rawPayload?: Record<string, unknown> | null;
    explanationText?: string | null;
    capturedAt: Date;
  }): Promise<ITrendSignal> {
    const create = this.model['create'] as (args: unknown) => Promise<unknown>;
    return (await create({ data })) as ITrendSignal;
  }

  async findBySubject(
    subjectType: TrendSignalSubjectType,
    subjectId: string,
  ): Promise<ITrendSignal[]> {
    const findMany = this.model['findMany'] as (args: unknown) => Promise<unknown[]>;
    return (await findMany({
      where: { subjectType, subjectId },
      orderBy: { capturedAt: 'desc' },
    })) as ITrendSignal[];
  }

  /** All signals of one type/classification, newest first — small enough at foundation scale for the caller to reduce to "latest per subject" itself rather than needing a DB-side window function. */
  async findAllByTypeAndClassification(
    signalType: string,
    classification: TrendSignalClassification,
  ): Promise<ITrendSignal[]> {
    const findMany = this.model['findMany'] as (args: unknown) => Promise<unknown[]>;
    return (await findMany({
      where: { signalType, classification },
      orderBy: { capturedAt: 'desc' },
    })) as ITrendSignal[];
  }
}
