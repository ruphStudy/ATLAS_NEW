import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';

@Injectable()
export class MarketplaceRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
