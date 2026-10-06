import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId, UserId } from '@common/decorators';
import { PurchaseOrderService } from './purchase-order.service';
import {
  AcknowledgePurchaseOrderDto,
  ApprovePurchaseOrderDto,
  CancelPurchaseOrderDto,
  CreatePurchaseOrderDto,
  PurchaseOrderExportDto,
  PurchaseOrderFilterDto,
  PurchaseOrderHistoryResponseDto,
  PurchaseOrderListResponseDto,
  PurchaseOrderResponseDto,
  UpdatePurchaseOrderDto,
} from './dto';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchase-orders')
export class PurchaseOrderController {
  constructor(private readonly service: PurchaseOrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Purchase Order (Draft)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Duplicate active PO for procurement' })
  async create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List Purchase Orders with filtering, sorting, and pagination' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderListResponseDto })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: PurchaseOrderFilterDto,
  ): Promise<PurchaseOrderListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get Purchase Order statistics by status' })
  @ApiResponse({ status: HttpStatus.OK })
  async getStats(@WorkspaceId() workspaceId: string): Promise<Record<string, number>> {
    return this.service.getStats(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a Purchase Order by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/export')
  @ApiOperation({ summary: 'Export Purchase Order data (printable format)' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderExportDto })
  async export(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<PurchaseOrderExportDto> {
    return this.service.export(id, workspaceId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get status change history for a Purchase Order' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: [PurchaseOrderHistoryResponseDto] })
  async getHistory(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<PurchaseOrderHistoryResponseDto[]> {
    return this.service.getHistory(id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update / revise a DRAFT Purchase Order' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: UpdatePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.update(id, workspaceId, dto, userId);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit Purchase Order for approval' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  async submitForApproval(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.submitForApproval(id, workspaceId, userId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending Purchase Order' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  async approve(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: ApprovePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.approve(id, workspaceId, userId, dto);
  }

  @Post(':id/issue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Issue the Purchase Order to the supplier' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  async issue(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.issue(id, workspaceId, userId);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark Purchase Order as acknowledged by supplier' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  async acknowledge(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: AcknowledgePurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.acknowledge(id, workspaceId, userId, dto);
  }

  @Post(':id/partially-fulfilled')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark Purchase Order as partially fulfilled' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  async markPartiallyFulfilled(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.markPartiallyFulfilled(id, workspaceId, userId);
  }

  @Post(':id/fulfill')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark Purchase Order as fulfilled' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  async markFulfilled(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.markFulfilled(id, workspaceId, userId);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close a fulfilled Purchase Order' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  async close(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.close(id, workspaceId, userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a Purchase Order' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: PurchaseOrderResponseDto })
  async cancel(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: CancelPurchaseOrderDto,
  ): Promise<PurchaseOrderResponseDto> {
    return this.service.cancel(id, workspaceId, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a DRAFT Purchase Order' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(id, workspaceId);
  }
}
