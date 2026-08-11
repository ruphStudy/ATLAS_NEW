import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserId, WorkspaceId } from '@common/decorators';
import { InventoryAllocationService } from './inventory-allocation.service';
import {
  AllocateInventoryDto,
  CancelAllocationDto,
  InventoryAllocationFilterDto,
  ReallocateInventoryDto,
  ReleaseAllocationDto,
} from '../dto';

@Controller('inventory/allocations')
export class InventoryAllocationController {
  constructor(private readonly service: InventoryAllocationService) {}

  @Post()
  allocate(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: AllocateInventoryDto,
  ) {
    return this.service.allocate(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: InventoryAllocationFilterDto) {
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

  @Post(':id/reallocate')
  reallocate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReallocateInventoryDto,
  ) {
    return this.service.reallocate(id, workspaceId, dto, userId);
  }

  @Post(':id/release')
  release(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReleaseAllocationDto,
  ) {
    return this.service.release(id, workspaceId, dto, userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CancelAllocationDto,
  ) {
    return this.service.cancel(id, workspaceId, dto, userId);
  }
}
