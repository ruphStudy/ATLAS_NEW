import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserId, UserRole, WorkspaceId } from '@common/decorators';
import { InventoryAdjustmentService } from './inventory-adjustment.service';
import {
  ApproveAdjustmentDto,
  CancelAdjustmentDto,
  CreateAdjustmentDto,
  InventoryAdjustmentFilterDto,
  PostAdjustmentDto,
  RejectAdjustmentDto,
  ReverseAdjustmentDto,
} from '../dto';

@Controller('inventory/adjustments')
export class InventoryAdjustmentController {
  constructor(private readonly service: InventoryAdjustmentService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @UserRole() userRole: string,
    @Body() dto: CreateAdjustmentDto,
  ) {
    return this.service.create(workspaceId, dto, userId, userRole);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: InventoryAdjustmentFilterDto) {
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
    @Body() dto: ApproveAdjustmentDto,
  ) {
    return this.service.approve(id, workspaceId, dto, userId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RejectAdjustmentDto,
  ) {
    return this.service.reject(id, workspaceId, dto, userId);
  }

  @Post(':id/post')
  post(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: PostAdjustmentDto,
  ) {
    return this.service.post(id, workspaceId, dto, userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CancelAdjustmentDto,
  ) {
    return this.service.cancel(id, workspaceId, dto, userId);
  }

  @Post(':id/reverse')
  reverse(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReverseAdjustmentDto,
  ) {
    return this.service.reverse(id, workspaceId, dto, userId);
  }
}
