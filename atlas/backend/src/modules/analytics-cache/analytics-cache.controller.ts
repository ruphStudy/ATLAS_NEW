import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AnalyticsCacheService } from './analytics-cache.service';
import {
  SetCacheDto,
  GetCacheDto,
  InvalidateCacheDto,
  WarmCacheDto,
  CacheMetricsFilterDto,
  CacheEntryResponseDto,
  CacheInvalidationResponseDto,
  CacheMetricsResponseDto,
  CacheStatsResponseDto,
} from './dto';

@Controller('analytics-cache')
export class AnalyticsCacheController {
  constructor(private readonly analyticsCacheService: AnalyticsCacheService) {}

  @Post('get')
  @HttpCode(HttpStatus.OK)
  async get(@Body() dto: GetCacheDto): Promise<{ data: any | null; cached: boolean }> {
    const data = await this.analyticsCacheService.get(dto);
    return {
      data,
      cached: data !== null,
    };
  }

  @Post('set')
  @HttpCode(HttpStatus.OK)
  async set(@Body() dto: SetCacheDto): Promise<CacheEntryResponseDto> {
    return this.analyticsCacheService.set(dto);
  }

  @Post('invalidate')
  @HttpCode(HttpStatus.OK)
  async invalidate(@Body() dto: InvalidateCacheDto): Promise<CacheInvalidationResponseDto> {
    return this.analyticsCacheService.invalidate(dto);
  }

  @Post('bulk-invalidate')
  @HttpCode(HttpStatus.OK)
  async bulkInvalidate(
    @Body() body: { workspaceId: string; invalidations: InvalidateCacheDto[] },
  ): Promise<CacheInvalidationResponseDto[]> {
    return this.analyticsCacheService.bulkInvalidate(body.workspaceId, body.invalidations);
  }

  @Post('warm')
  @HttpCode(HttpStatus.OK)
  async warmCache(@Body() dto: WarmCacheDto): Promise<{ warmedCount: number }> {
    return this.analyticsCacheService.warmCache(dto);
  }

  @Get('stats')
  async getStats(@Query('workspaceId') workspaceId: string): Promise<CacheStatsResponseDto> {
    return this.analyticsCacheService.getStats(workspaceId);
  }

  @Get('metrics')
  async getMetrics(@Query() filter: CacheMetricsFilterDto): Promise<CacheMetricsResponseDto[]> {
    return this.analyticsCacheService.getMetrics(filter);
  }

  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanupExpired(
    @Query('workspaceId') workspaceId: string,
  ): Promise<{ cleanedCount: number }> {
    return this.analyticsCacheService.cleanupExpired(workspaceId);
  }
}
