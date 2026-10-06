import { ApiProperty } from '@nestjs/swagger';

export class DiscoveryStatsDto {
  @ApiProperty({ example: 25 })
  totalSessions: number = 0;

  @ApiProperty({ example: 2 })
  runningSessions: number = 0;

  @ApiProperty({ example: 340 })
  totalDiscovered: number = 0;

  @ApiProperty({ example: 210 })
  totalNewOpportunities: number = 0;

  @ApiProperty({ example: 130 })
  totalDuplicatesSkipped: number = 0;

  @ApiProperty({
    example: { AMAZON: 20, WALMART: 5 },
    description: 'Session count grouped by marketplace',
  })
  byMarketplace: Record<string, number> = {};

  @ApiProperty({
    example: { COMPLETED: 22, RUNNING: 2, FAILED: 1 },
    description: 'Session count grouped by status',
  })
  byStatus: Record<string, number> = {};
}
