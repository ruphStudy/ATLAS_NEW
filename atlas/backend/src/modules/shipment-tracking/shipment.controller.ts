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
import { ShipmentService } from './shipment.service';
import {
  CancelShipmentDto,
  CreateShipmentDto,
  DeliverShipmentDto,
  DispatchShipmentDto,
  ShipmentFilterDto,
  ShipmentListResponseDto,
  ShipmentResponseDto,
  ShipmentTrackingHistoryResponseDto,
  UpdateShipmentDto,
  UpdateTrackingDto,
} from './dto';

@ApiTags('Shipment Tracking')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shipments')
export class ShipmentController {
  constructor(private readonly service: ShipmentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new shipment' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ShipmentResponseDto })
  async create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List shipments with filtering, sorting, and pagination' })
  @ApiResponse({ status: HttpStatus.OK, type: ShipmentListResponseDto })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: ShipmentFilterDto,
  ): Promise<ShipmentListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get shipment statistics by status' })
  @ApiResponse({ status: HttpStatus.OK })
  async getStats(@WorkspaceId() workspaceId: string): Promise<Record<string, number>> {
    return this.service.getStats(workspaceId);
  }

  @Post('sync-tracking')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trigger carrier tracking sync for all active trackable shipments' })
  @ApiResponse({ status: HttpStatus.OK })
  async scheduleTrackingSync(
    @WorkspaceId() workspaceId: string,
  ): Promise<{ queued: number }> {
    return this.service.scheduleTrackingSync(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a shipment by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ShipmentResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<ShipmentResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/tracking-history')
  @ApiOperation({ summary: 'Get tracking event history for a shipment' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: [ShipmentTrackingHistoryResponseDto] })
  async getTrackingHistory(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<ShipmentTrackingHistoryResponseDto[]> {
    return this.service.getTrackingHistory(id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update shipment details' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ShipmentResponseDto })
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
  ): Promise<ShipmentResponseDto> {
    return this.service.update(id, workspaceId, dto);
  }

  @Post(':id/dispatch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark shipment as dispatched' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ShipmentResponseDto })
  async dispatch(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: DispatchShipmentDto,
  ): Promise<ShipmentResponseDto> {
    return this.service.dispatch(id, workspaceId, dto, userId);
  }

  @Post(':id/tracking')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually add a tracking update' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ShipmentResponseDto })
  async updateTracking(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: UpdateTrackingDto,
  ): Promise<ShipmentResponseDto> {
    return this.service.updateTracking(id, workspaceId, dto, userId, 'MANUAL');
  }

  @Post(':id/deliver')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark shipment as delivered' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ShipmentResponseDto })
  async deliver(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: DeliverShipmentDto,
  ): Promise<ShipmentResponseDto> {
    return this.service.deliver(id, workspaceId, dto, userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a shipment' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ShipmentResponseDto })
  async cancel(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: CancelShipmentDto,
  ): Promise<ShipmentResponseDto> {
    return this.service.cancel(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a shipment' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(id, workspaceId);
  }
}
