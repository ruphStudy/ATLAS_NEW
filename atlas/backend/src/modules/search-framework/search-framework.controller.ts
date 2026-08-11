import { Controller, Get, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WorkspaceId, UserId, UserRole } from '@common/decorators';
import { SearchFrameworkService } from './search-framework.service';
import {
  RegisterSearchEntityDto,
  IndexDocumentDto,
  BulkIndexDto,
  SearchQueryDto,
  SearchEntityRegistrationResponseDto,
  SearchResultPageResponseDto,
} from './dto';

@Controller({ path: 'search-framework', version: '1' })
export class SearchFrameworkController {
  constructor(private readonly searchFrameworkService: SearchFrameworkService) {}

  // ── Query (static routes first) ────────────────────────────────

  @Get('query')
  async search(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Query() dto: SearchQueryDto,
  ): Promise<SearchResultPageResponseDto> {
    return (await this.searchFrameworkService.search(
      workspaceId,
      userId,
      userRole,
      dto,
    )) as unknown as SearchResultPageResponseDto;
  }

  // ── Entity registry ──────────────────────────────────────────────

  @Post('registrations')
  @HttpCode(HttpStatus.CREATED)
  async registerEntity(
    @UserRole() userRole: string,
    @UserId() userId: string,
    @Body() dto: RegisterSearchEntityDto,
  ): Promise<SearchEntityRegistrationResponseDto> {
    return (await this.searchFrameworkService.registerEntity(
      userRole,
      userId,
      dto,
    )) as unknown as SearchEntityRegistrationResponseDto;
  }

  @Get('registrations')
  async listRegistrations(): Promise<SearchEntityRegistrationResponseDto[]> {
    return (await this.searchFrameworkService.listRegistrations()) as unknown as SearchEntityRegistrationResponseDto[];
  }

  @Get('registrations/:key')
  async getRegistration(@Param('key') key: string): Promise<SearchEntityRegistrationResponseDto> {
    return (await this.searchFrameworkService.getRegistration(key)) as unknown as SearchEntityRegistrationResponseDto;
  }

  @Delete('registrations/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unregisterEntity(
    @Param('key') key: string,
    @UserRole() userRole: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.searchFrameworkService.unregisterEntity(key, userRole, userId);
  }

  // ── Indexing ─────────────────────────────────────────────────────

  @Post('documents')
  @HttpCode(HttpStatus.CREATED)
  async indexDocument(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: IndexDocumentDto,
  ) {
    return this.searchFrameworkService.indexDocument(workspaceId, userId, dto);
  }

  @Post('documents/bulk')
  async bulkIndex(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: BulkIndexDto,
  ): Promise<{ queued: number }> {
    return this.searchFrameworkService.bulkIndex(workspaceId, userId, dto);
  }

  @Delete('documents/:entityType/:entityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeDocument(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.searchFrameworkService.removeDocument(workspaceId, entityType, entityId, userId);
  }

  @Post('reindex/:entityType')
  async requestReindex(
    @Param('entityType') entityType: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
  ): Promise<void> {
    await this.searchFrameworkService.requestReindex(workspaceId, entityType, userId);
  }
}
