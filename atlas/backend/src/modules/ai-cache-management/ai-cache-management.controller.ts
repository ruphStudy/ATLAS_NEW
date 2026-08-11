import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiCacheManagementService } from './ai-cache-management.service';
import {
  CacheLookupDto,
  CacheStoreDto,
  CreateCachePolicyDto,
  UpdateCachePolicyDto,
  CacheInvalidateDto,
  CacheEntryFilterDto,
  CacheLookupResponseDto,
  CacheEntryResponseDto,
  PaginatedCacheEntryResponseDto,
  CachePolicyResponseDto,
  CacheInvalidationResponseDto,
  CacheSavingsResponseDto,
} from './dto';

@Controller('ai-cache-management')
export class AiCacheManagementController {
  constructor(private readonly cacheService: AiCacheManagementService) {}

  @Post('lookup')
  @HttpCode(HttpStatus.OK)
  async lookup(@Body() dto: CacheLookupDto): Promise<CacheLookupResponseDto> {
    return this.cacheService.lookup(dto);
  }

  @Post('store')
  @HttpCode(HttpStatus.CREATED)
  async store(@Body() dto: CacheStoreDto): Promise<CacheEntryResponseDto> {
    return this.cacheService.store(dto);
  }

  @Post('invalidate')
  @HttpCode(HttpStatus.OK)
  async invalidate(
    @Body() dto: CacheInvalidateDto,
  ): Promise<CacheInvalidationResponseDto> {
    return this.cacheService.invalidate(dto);
  }

  @Get('entries')
  async findAllCacheEntries(
    @Query() filter: CacheEntryFilterDto,
  ): Promise<PaginatedCacheEntryResponseDto> {
    return this.cacheService.findAllCacheEntries(filter);
  }

  @Get('entries/:id')
  async findCacheEntryById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<CacheEntryResponseDto> {
    return this.cacheService.findCacheEntryById(id, workspaceId);
  }

  @Post('policies')
  @HttpCode(HttpStatus.CREATED)
  async createCachePolicy(
    @Body() dto: CreateCachePolicyDto,
  ): Promise<CachePolicyResponseDto> {
    return this.cacheService.createCachePolicy(dto);
  }

  @Patch('policies/:id')
  async updateCachePolicy(
    @Param('id') id: string,
    @Body() dto: UpdateCachePolicyDto,
  ): Promise<CachePolicyResponseDto> {
    return this.cacheService.updateCachePolicy(id, dto);
  }

  @Delete('policies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteCachePolicy(@Param('id') id: string): Promise<void> {
    await this.cacheService.deleteCachePolicy(id);
  }

  @Get('policies/:id')
  async findCachePolicyById(
    @Param('id') id: string,
  ): Promise<CachePolicyResponseDto> {
    return this.cacheService.findCachePolicyById(id);
  }

  @Get('savings')
  async getCacheSavings(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<CacheSavingsResponseDto> {
    return this.cacheService.getCacheSavings(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('evict-expired')
  @HttpCode(HttpStatus.OK)
  async evictExpired(
    @Query('workspaceId') workspaceId: string,
  ): Promise<{ evicted: number }> {
    const count = await this.cacheService.evictExpired(workspaceId);
    return { evicted: count };
  }

  @Post('mark-stale')
  @HttpCode(HttpStatus.OK)
  async markStale(
    @Query('workspaceId') workspaceId: string,
  ): Promise<{ marked: number }> {
    const count = await this.cacheService.markStale(workspaceId);
    return { marked: count };
  }
}
