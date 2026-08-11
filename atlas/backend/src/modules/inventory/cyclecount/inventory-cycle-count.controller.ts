import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserId, WorkspaceId } from '@common/decorators';
import { InventoryCycleCountService } from './inventory-cycle-count.service';
import {
  AssignCycleCountDto,
  CancelCycleCountDto,
  CompleteCycleCountDto,
  ApproveCycleCountDto,
  CreateCycleCountDto,
  FlagRecountDto,
  InventoryCycleCountFilterDto,
  InventoryCycleCountLineFilterDto,
  PauseCycleCountDto,
  RejectCycleCountDto,
  ScheduleCycleCountDto,
  StartCycleCountDto,
  SubmitCycleCountLineDto,
} from '../dto';

@Controller('inventory/cycle-counts')
export class InventoryCycleCountController {
  constructor(private readonly service: InventoryCycleCountService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateCycleCountDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: InventoryCycleCountFilterDto) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getHistory(id, workspaceId);
  }

  @Get(':id/lines')
  findLines(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: InventoryCycleCountLineFilterDto,
  ) {
    return this.service.findLines(id, workspaceId, filter);
  }

  @Get(':id/lines/:lineId')
  findLineById(@Param('lineId') lineId: string, @WorkspaceId() workspaceId: string) {
    return this.service.findLineById(lineId, workspaceId);
  }

  @Post(':id/schedule')
  schedule(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ScheduleCycleCountDto,
  ) {
    return this.service.schedule(id, workspaceId, dto, userId);
  }

  @Post(':id/assign')
  assign(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: AssignCycleCountDto,
  ) {
    return this.service.assign(id, workspaceId, dto, userId);
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: StartCycleCountDto,
  ) {
    return this.service.start(id, workspaceId, dto, userId);
  }

  @Post(':id/pause')
  pause(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: PauseCycleCountDto,
  ) {
    return this.service.pause(id, workspaceId, dto, userId);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CompleteCycleCountDto,
  ) {
    return this.service.complete(id, workspaceId, dto, userId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApproveCycleCountDto,
  ) {
    return this.service.approve(id, workspaceId, dto, userId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RejectCycleCountDto,
  ) {
    return this.service.reject(id, workspaceId, dto, userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CancelCycleCountDto,
  ) {
    return this.service.cancel(id, workspaceId, dto, userId);
  }

  @Post(':id/lines/:lineId/count')
  submitCount(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: SubmitCycleCountLineDto,
  ) {
    return this.service.submitCount(id, lineId, workspaceId, dto, userId);
  }

  @Post(':id/lines/:lineId/flag-recount')
  flagRecount(
    @Param('id') id: string,
    @Param('lineId') lineId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: FlagRecountDto,
  ) {
    return this.service.flagRecount(id, lineId, workspaceId, dto, userId);
  }
}
