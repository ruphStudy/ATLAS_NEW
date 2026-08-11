import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { MarketplaceErrorNormalizerService } from './marketplace-error-normalizer.service';
import {
  NormalizeErrorRequestDto,
  SearchErrorsQueryDto,
  GetTopErrorsQueryDto,
  ResolveErrorRequestDto,
  GetAggregatedErrorsQueryDto,
  NormalizedErrorResponseDto,
  ErrorClassificationResponseDto,
  SafeErrorResponseDto,
  InternalErrorResponseDto,
  UserFacingErrorResponseDto,
  ErrorHistoryResponseDto,
  ErrorOccurrenceResponseDto,
  ErrorAggregationByCategoryResponseDto,
  ErrorAggregationBySeverityResponseDto,
} from './dto';

@Controller('marketplace/error-normalizer')
export class MarketplaceErrorNormalizerController {
  constructor(
    private readonly errorNormalizerService: MarketplaceErrorNormalizerService,
  ) {}

  @Post('normalize')
  async normalizeError(
    @Body() dto: NormalizeErrorRequestDto,
  ): Promise<NormalizedErrorResponseDto> {
    return this.errorNormalizerService.normalizeAndRecord(
      {
        providerCode: dto.providerCode,
        providerMessage: dto.providerMessage,
        httpStatus: dto.httpStatus,
        requestId: dto.requestId,
        traceId: dto.traceId,
        metadata: dto.metadata,
      },
      {
        workspaceId: dto.workspaceId,
        provider: dto.provider,
        accountId: dto.accountId,
        module: dto.module,
        operation: dto.operation,
        resourceId: dto.resourceId,
      },
    );
  }

  @Post('classify')
  async classifyError(
    @Body() error: NormalizedErrorResponseDto,
  ): Promise<ErrorClassificationResponseDto> {
    return this.errorNormalizerService.classifyError(error as any);
  }

  @Post('to-safe-response')
  async toSafeResponse(
    @Body() error: NormalizedErrorResponseDto,
  ): Promise<SafeErrorResponseDto> {
    return this.errorNormalizerService.toSafeResponse(error as any);
  }

  @Post('to-internal-response')
  async toInternalResponse(
    @Body() error: NormalizedErrorResponseDto,
  ): Promise<InternalErrorResponseDto> {
    return this.errorNormalizerService.toInternalResponse(error as any);
  }

  @Post('to-user-facing-response')
  async toUserFacingResponse(
    @Body() error: NormalizedErrorResponseDto,
  ): Promise<UserFacingErrorResponseDto> {
    return this.errorNormalizerService.toUserFacingResponse(error as any);
  }

  @Get('search')
  async searchErrors(
    @Query() query: SearchErrorsQueryDto,
  ): Promise<ErrorHistoryResponseDto[]> {
    return this.errorNormalizerService.searchErrors({
      workspaceId: query.workspaceId,
      provider: query.provider,
      accountId: query.accountId,
      module: query.module,
      errorCode: query.errorCode,
      category: query.category,
      severity: query.severity,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      isResolved: query.isResolved,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('count')
  async countErrors(@Query() query: SearchErrorsQueryDto): Promise<number> {
    return this.errorNormalizerService.countErrors({
      workspaceId: query.workspaceId,
      provider: query.provider,
      accountId: query.accountId,
      module: query.module,
      errorCode: query.errorCode,
      category: query.category,
      severity: query.severity,
      isResolved: query.isResolved,
    });
  }

  @Get('top')
  async getTopErrors(
    @Query() query: GetTopErrorsQueryDto,
  ): Promise<ErrorHistoryResponseDto[]> {
    return this.errorNormalizerService.getTopErrors(
      query.workspaceId,
      query.limit,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
    );
  }

  @Get('history/:workspaceId/:historyId')
  async getErrorHistory(
    @Param('workspaceId') workspaceId: string,
    @Param('historyId') historyId: string,
  ): Promise<ErrorHistoryResponseDto | null> {
    return this.errorNormalizerService.getErrorHistory(workspaceId, historyId);
  }

  @Get('occurrences/:workspaceId/:historyId')
  async getErrorOccurrences(
    @Param('workspaceId') workspaceId: string,
    @Param('historyId') historyId: string,
    @Query('limit') limit?: string,
  ): Promise<ErrorOccurrenceResponseDto[]> {
    return this.errorNormalizerService.getErrorOccurrences(
      workspaceId,
      historyId,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('resolve')
  async resolveError(@Body() dto: ResolveErrorRequestDto): Promise<void> {
    await this.errorNormalizerService.resolveError(
      dto.workspaceId,
      dto.historyId,
    );
  }

  @Get('aggregate/category')
  async aggregateByCategory(
    @Query() query: GetAggregatedErrorsQueryDto,
  ): Promise<ErrorAggregationByCategoryResponseDto[]> {
    return this.errorNormalizerService.aggregateErrorsByCategory(
      query.workspaceId,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get('aggregate/severity')
  async aggregateBySeverity(
    @Query() query: GetAggregatedErrorsQueryDto,
  ): Promise<ErrorAggregationBySeverityResponseDto[]> {
    return this.errorNormalizerService.aggregateErrorsBySeverity(
      query.workspaceId,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }
}
