import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserId, WorkspaceId } from '@common/decorators';
import { InventoryReservationService } from './inventory-reservation.service';
import {
  CancelReservationDto,
  ConfirmReservationDto,
  CreateReservationDto,
  InventoryReservationFilterDto,
  ReleaseReservationDto,
} from '../dto';

@Controller('inventory/reservations')
export class InventoryReservationController {
  constructor(private readonly service: InventoryReservationService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateReservationDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  findAll(@WorkspaceId() workspaceId: string, @Query() filter: InventoryReservationFilterDto) {
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

  @Post(':id/confirm')
  confirm(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ConfirmReservationDto,
  ) {
    return this.service.confirm(id, workspaceId, dto, userId);
  }

  @Post(':id/release')
  release(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReleaseReservationDto,
  ) {
    return this.service.release(id, workspaceId, dto, userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CancelReservationDto,
  ) {
    return this.service.cancel(id, workspaceId, dto, userId);
  }
}
