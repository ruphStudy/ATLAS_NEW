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
} from '@nestjs/common';
import { WorkspaceId, UserId } from '@common/decorators';
import { WarehouseZoneService } from './warehouse-zone.service';
import {
  CreateWarehouseZoneDto,
  UpdateWarehouseZoneDto,
  WarehouseZoneFilterDto,
  WarehouseZoneResponseDto,
  WarehouseZoneListResponseDto,
  WarehouseZoneHistoryResponseDto,
  ActivateZoneDto,
  DeactivateZoneDto,
  BlockZoneDto,
  ArchiveZoneDto,
  RestoreZoneDto,
} from './dto';

@Controller('warehouses/:warehouseId/zones')
export class WarehouseZoneController {
  constructor(private readonly service: WarehouseZoneService) {}

  @Post()
  create(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateWarehouseZoneDto,
  ): Promise<WarehouseZoneResponseDto> {
    return this.service.create(warehouseId, workspaceId, dto, userId);
  }

  @Get()
  findAll(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: WarehouseZoneFilterDto,
  ): Promise<WarehouseZoneListResponseDto> {
    return this.service.findAll(warehouseId, workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WarehouseZoneResponseDto> {
    return this.service.findById(id, warehouseId, workspaceId);
  }

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WarehouseZoneHistoryResponseDto[]> {
    return this.service.getHistory(id, warehouseId, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateWarehouseZoneDto,
  ): Promise<WarehouseZoneResponseDto> {
    return this.service.update(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/activate')
  activate(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ActivateZoneDto,
  ): Promise<WarehouseZoneResponseDto> {
    return this.service.activate(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/deactivate')
  deactivate(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: DeactivateZoneDto,
  ): Promise<WarehouseZoneResponseDto> {
    return this.service.deactivate(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/block')
  block(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: BlockZoneDto,
  ): Promise<WarehouseZoneResponseDto> {
    return this.service.block(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ArchiveZoneDto,
  ): Promise<WarehouseZoneResponseDto> {
    return this.service.archive(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/restore')
  restore(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RestoreZoneDto,
  ): Promise<WarehouseZoneResponseDto> {
    return this.service.restore(id, warehouseId, workspaceId, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<void> {
    return this.service.remove(id, warehouseId, workspaceId);
  }
}
