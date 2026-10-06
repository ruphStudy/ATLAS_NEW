import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { WorkspaceId, UserId } from '@common/decorators';
import { InventoryTransferService } from './inventory-transfer.service';
import {
  CreateTransferDto,
  ApproveTransferDto,
  DispatchTransferDto,
  ReceiveTransferDto,
  CancelTransferDto,
  ReverseTransferDto,
  InventoryTransferFilterDto,
  InventoryTransferResponseDto,
  InventoryTransferListResponseDto,
  InventoryTransferHistoryResponseDto,
} from '../dto';

@Controller('inventory/transfers')
export class InventoryTransferController {
  constructor(private readonly service: InventoryTransferService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateTransferDto,
  ): Promise<InventoryTransferResponseDto> {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: InventoryTransferFilterDto,
  ): Promise<InventoryTransferListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<InventoryTransferResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<InventoryTransferHistoryResponseDto[]> {
    return this.service.getHistory(id, workspaceId);
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ApproveTransferDto,
  ): Promise<InventoryTransferResponseDto> {
    return this.service.approve(id, workspaceId, dto, userId);
  }

  @Post(':id/dispatch')
  dispatch(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: DispatchTransferDto,
  ): Promise<InventoryTransferResponseDto> {
    return this.service.dispatch(id, workspaceId, dto, userId);
  }

  @Post(':id/receive')
  receive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReceiveTransferDto,
  ): Promise<InventoryTransferResponseDto> {
    return this.service.receive(id, workspaceId, dto, userId);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CancelTransferDto,
  ): Promise<InventoryTransferResponseDto> {
    return this.service.cancel(id, workspaceId, dto, userId);
  }

  @Post(':id/reverse')
  reverse(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReverseTransferDto,
  ): Promise<InventoryTransferResponseDto> {
    return this.service.reverse(id, workspaceId, dto, userId);
  }
}
