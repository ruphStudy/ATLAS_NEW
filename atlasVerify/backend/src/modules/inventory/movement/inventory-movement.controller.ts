import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserId, WorkspaceId } from '@common/decorators';
import { InventoryMovementService } from './inventory-movement.service';
import {
  ApproveMovementDto,
  CancelMovementDto,
  CreateMovementDto,
  ExecuteMovementDto,
  InventoryMovementFilterDto,
  ReverseMovementDto,
} from '../dto';

@Controller('inventory/movements')
export class InventoryMovementController {
  constructor(private readonly service: InventoryMovementService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateMovementDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: InventoryMovementFilterDto) {
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

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApproveMovementDto,
  ) {
    return this.service.approve(id, workspaceId, dto, userId);
  }

  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ExecuteMovementDto,
  ) {
    return this.service.execute(id, workspaceId, dto, userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CancelMovementDto,
  ) {
    return this.service.cancel(id, workspaceId, dto, userId);
  }

  @Post(':id/reverse')
  reverse(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReverseMovementDto,
  ) {
    return this.service.reverse(id, workspaceId, dto, userId);
  }
}
