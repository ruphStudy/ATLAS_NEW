import { Controller, Get, Post, Patch, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { SearchQueryDto } from '@modules/search-framework/dto';
import { GlobalSearchService } from './global-search.service';
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
  OpenResultDto,
  SuggestionsQueryDto,
  RecentQueryDto,
  GlobalSearchResponseDto,
  SavedSearchResponseDto,
  RecentEntityResponseDto,
  RecentSearchResponseDto,
} from './dto';

@Controller({ path: 'global-search', version: '1' })
export class GlobalSearchController {
  constructor(private readonly globalSearchService: GlobalSearchService) {}

  // ── Query ────────────────────────────────────────────────────────

  @Get('query')
  async search(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() dto: SearchQueryDto,
  ): Promise<GlobalSearchResponseDto> {
    return (await this.globalSearchService.search(
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as GlobalSearchResponseDto;
  }

  @Get('suggestions')
  async getSuggestions(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() query: SuggestionsQueryDto,
  ): Promise<string[]> {
    return this.globalSearchService.getSuggestions(workspaceId, userId, userRole, query.q, query.limit);
  }

  @Post('opened')
  @HttpCode(HttpStatus.NO_CONTENT)
  async openResult(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: OpenResultDto,
  ): Promise<void> {
    await this.globalSearchService.openResult(workspaceId, userId, dto);
  }

  @Get('recent-searches')
  async getRecentSearches(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Query() query: RecentQueryDto,
  ): Promise<RecentSearchResponseDto[]> {
    return this.globalSearchService.getRecentSearches(workspaceId, userId, query.limit) as unknown as RecentSearchResponseDto[];
  }

  @Get('search-history')
  async getSearchHistory(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Query() query: RecentQueryDto,
  ) {
    return this.globalSearchService.getSearchHistory(workspaceId, userId, query.limit);
  }

  @Get('recent-entities')
  async getRecentEntities(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Query() query: RecentQueryDto,
  ): Promise<RecentEntityResponseDto[]> {
    return this.globalSearchService.getRecentEntities(
      workspaceId,
      userId,
      query.limit,
    ) as unknown as RecentEntityResponseDto[];
  }

  // ── Saved searches ───────────────────────────────────────────────

  @Post('saved-searches')
  @HttpCode(HttpStatus.CREATED)
  async createSavedSearch(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    return (await this.globalSearchService.createSavedSearch(
      workspaceId,
      userId,
      dto,
    )) as unknown as SavedSearchResponseDto;
  }

  @Get('saved-searches')
  async listSavedSearches(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<SavedSearchResponseDto[]> {
    return (await this.globalSearchService.listSavedSearches(
      workspaceId,
      userId,
    )) as unknown as SavedSearchResponseDto[];
  }

  @Patch('saved-searches/:id')
  async updateSavedSearch(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    return (await this.globalSearchService.updateSavedSearch(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as SavedSearchResponseDto;
  }

  @Delete('saved-searches/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSavedSearch(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.globalSearchService.deleteSavedSearch(id, workspaceId, userId);
  }
}
