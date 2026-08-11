import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { MarketplaceEventService } from './marketplace-event.service';
import {
  SubmitEventRequestDto,
  EventFilterQueryDto,
  ReprocessEventRequestDto,
  CancelEventRequestDto,
  MarketplaceEventResponseDto,
  PaginatedMarketplaceEventResponseDto,
} from './dto';

@Controller('marketplace-event')
export class MarketplaceEventController {
  constructor(private readonly service: MarketplaceEventService) {}

  @Post('submit')
  async submitEvent(@Body() dto: SubmitEventRequestDto): Promise<MarketplaceEventResponseDto> {
    const event = await this.service.submitEvent(dto);
    return MarketplaceEventResponseDto.from(event);
  }

  @Get('events')
  async findEvents(@Query() query: EventFilterQueryDto): Promise<PaginatedMarketplaceEventResponseDto> {
    const result = await this.service.findEvents(query);
    return {
      items: result.items.map(MarketplaceEventResponseDto.from),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('events/:workspaceId/:eventId')
  async getEvent(
    @Param('eventId') eventId: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<MarketplaceEventResponseDto> {
    const event = await this.service.getEvent(eventId, workspaceId);
    return MarketplaceEventResponseDto.from(event);
  }

  @Get('events/:workspaceId/:eventId/history')
  async getEventHistory(
    @Param('eventId') eventId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.service.getEventHistory(eventId, workspaceId);
  }

  @Post('reprocess')
  @HttpCode(HttpStatus.OK)
  async reprocessEvent(@Body() dto: ReprocessEventRequestDto): Promise<MarketplaceEventResponseDto> {
    const event = await this.service.reprocessEvent(dto);
    return MarketplaceEventResponseDto.from(event);
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelEvent(@Body() dto: CancelEventRequestDto): Promise<MarketplaceEventResponseDto> {
    const event = await this.service.cancelEvent(dto);
    return MarketplaceEventResponseDto.from(event);
  }

  @Get('failed/:workspaceId')
  async getFailedEvents(
    @Param('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
    @Query('limit') limit?: number,
  ): Promise<MarketplaceEventResponseDto[]> {
    const events = await this.service.getFailedEvents(workspaceId, accountId, limit);
    return events.map(MarketplaceEventResponseDto.from);
  }

  @Get('pending/:workspaceId')
  async getPendingEvents(
    @Param('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
    @Query('limit') limit?: number,
  ): Promise<MarketplaceEventResponseDto[]> {
    const events = await this.service.getPendingEvents(workspaceId, accountId, limit);
    return events.map(MarketplaceEventResponseDto.from);
  }

  @Get('metrics/:workspaceId')
  async getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.getMetrics(workspaceId, accountId);
  }
}
