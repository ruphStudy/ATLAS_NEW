import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { UserId, WorkspaceId } from '@common/decorators';
import { InventoryStockService } from './inventory-stock.service';
import {
  AdjustStockDto,
  ChangeStockStatusDto,
  DispatchStockDto,
  InventoryStockFilterDto,
  InventoryTransactionFilterDto,
  IssueStockDto,
  ReceiveStockDto,
  ReleaseStockDto,
  ReserveStockDto,
  ReturnStockDto,
  ReverseTransactionDto,
  TransferStockDto,
} from '../dto';

@Controller('inventory/items/:inventoryItemId/stock')
export class InventoryStockController {
  constructor(private readonly service: InventoryStockService) {}

  @Get()
  findAll(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: InventoryStockFilterDto,
  ) {
    return this.service.findAll(inventoryItemId, workspaceId, filter);
  }

  @Get('summary')
  getOnHandSummary(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.getOnHandSummary(inventoryItemId, workspaceId);
  }

  @Get('transactions')
  findTransactions(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: InventoryTransactionFilterDto,
  ) {
    return this.service.findTransactions(inventoryItemId, workspaceId, filter);
  }

  @Get('transactions/:transactionId')
  findTransactionById(
    @Param('inventoryItemId') inventoryItemId: string,
    @Param('transactionId') transactionId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findTransactionById(inventoryItemId, workspaceId, transactionId);
  }

  @Post('transactions/:transactionId/reverse')
  reverse(
    @Param('inventoryItemId') inventoryItemId: string,
    @Param('transactionId') transactionId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReverseTransactionDto,
  ) {
    return this.service.reverse(inventoryItemId, workspaceId, transactionId, dto, userId);
  }

  @Post('receive')
  receive(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReceiveStockDto,
  ) {
    return this.service.receive(inventoryItemId, workspaceId, dto, userId);
  }

  @Post('issue')
  issue(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: IssueStockDto,
  ) {
    return this.service.issue(inventoryItemId, workspaceId, dto, userId);
  }

  @Post('dispatch')
  dispatch(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: DispatchStockDto,
  ) {
    return this.service.dispatch(inventoryItemId, workspaceId, dto, userId);
  }

  @Post('return')
  returnStock(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReturnStockDto,
  ) {
    return this.service.returnStock(inventoryItemId, workspaceId, dto, userId);
  }

  @Post('transfer')
  transfer(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: TransferStockDto,
  ) {
    return this.service.transfer(inventoryItemId, workspaceId, dto, userId);
  }

  @Post('adjust')
  adjust(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: AdjustStockDto,
  ) {
    return this.service.adjust(inventoryItemId, workspaceId, dto, userId);
  }

  @Post('reserve')
  reserve(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReserveStockDto,
  ) {
    return this.service.reserve(inventoryItemId, workspaceId, dto, userId);
  }

  @Post('release')
  release(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ReleaseStockDto,
  ) {
    return this.service.release(inventoryItemId, workspaceId, dto, userId);
  }

  @Post('change-status')
  changeStatus(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ChangeStockStatusDto,
  ) {
    return this.service.changeStatus(inventoryItemId, workspaceId, dto, userId);
  }
}
