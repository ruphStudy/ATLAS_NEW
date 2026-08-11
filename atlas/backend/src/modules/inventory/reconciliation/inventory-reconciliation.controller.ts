import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserId, WorkspaceId } from '@common/decorators';
import { InventoryReconciliationService } from './inventory-reconciliation.service';
import {
  ApproveReconciliationLineDto,
  CancelReconciliationRunDto,
  CreateReconciliationRunDto,
  IgnoreReconciliationLineDto,
  InventoryReconciliationLineFilterDto,
  InventoryReconciliationRunFilterDto,
  RejectReconciliationLineDto,
  ReopenReconciliationLineDto,
  ResolveReconciliationLineDto,
} from '../dto';

@Controller('inventory/reconciliations')
export class InventoryReconciliationController {
  constructor(private readonly service: InventoryReconciliationService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateReconciliationRunDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: InventoryReconciliationRunFilterDto) {
    return this.service.findAllRuns(workspaceId, filter);
  }

  @Get(':id')
  findById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findRunById(id, workspaceId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getRunHistory(id, workspaceId);
  }

  @Get(':id/lines')
  findLines(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: InventoryReconciliationLineFilterDto,
  ) {
    return this.service.findLines(id, workspaceId, filter);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CancelReconciliationRunDto,
  ) {
    return this.service.cancel(id, workspaceId, dto, userId);
  }

  @Get('lines/:lineId')
  findLineById(@Param('lineId') lineId: string, @WorkspaceId() workspaceId: string) {
    return this.service.findLineById(lineId, workspaceId);
  }

  @Get('lines/:lineId/history')
  getLineHistory(@Param('lineId') lineId: string, @WorkspaceId() workspaceId: string) {
    return this.service.getLineHistory(lineId, workspaceId);
  }

  @Post('lines/:lineId/approve')
  approveLine(
    @Param('lineId') lineId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApproveReconciliationLineDto,
  ) {
    return this.service.approveLine(lineId, workspaceId, dto, userId);
  }

  @Post('lines/:lineId/reject')
  rejectLine(
    @Param('lineId') lineId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RejectReconciliationLineDto,
  ) {
    return this.service.rejectLine(lineId, workspaceId, dto, userId);
  }

  @Post('lines/:lineId/ignore')
  ignoreLine(
    @Param('lineId') lineId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: IgnoreReconciliationLineDto,
  ) {
    return this.service.ignoreLine(lineId, workspaceId, dto, userId);
  }

  @Post('lines/:lineId/resolve')
  resolveLine(
    @Param('lineId') lineId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ResolveReconciliationLineDto,
  ) {
    return this.service.resolveLine(lineId, workspaceId, dto, userId);
  }

  @Post('lines/:lineId/reopen')
  reopenLine(
    @Param('lineId') lineId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReopenReconciliationLineDto,
  ) {
    return this.service.reopenLine(lineId, workspaceId, dto, userId);
  }
}
