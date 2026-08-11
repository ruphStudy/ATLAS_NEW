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
import { WarehouseLocationService } from './warehouse-location.service';
import {
  CreateWarehouseLocationDto,
  UpdateWarehouseLocationDto,
  WarehouseLocationFilterDto,
  WarehouseLocationResponseDto,
  WarehouseLocationListResponseDto,
  WarehouseLocationHistoryResponseDto,
  ActivateLocationDto,
  DeactivateLocationDto,
  BlockLocationDto,
  ArchiveLocationDto,
  RestoreLocationDto,
} from './dto';

@Controller('warehouses/:warehouseId/locations')
export class WarehouseLocationController {
  constructor(private readonly service: WarehouseLocationService) {}

  @Post()
  create(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateWarehouseLocationDto,
  ): Promise<WarehouseLocationResponseDto> {
    return this.service.create(warehouseId, workspaceId, dto, userId);
  }

  @Get()
  findAll(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: WarehouseLocationFilterDto,
  ): Promise<WarehouseLocationListResponseDto> {
    return this.service.findAll(warehouseId, workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WarehouseLocationResponseDto> {
    return this.service.findById(id, warehouseId, workspaceId);
  }

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WarehouseLocationHistoryResponseDto[]> {
    return this.service.getHistory(id, warehouseId, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateWarehouseLocationDto,
  ): Promise<WarehouseLocationResponseDto> {
    return this.service.update(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/activate')
  activate(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ActivateLocationDto,
  ): Promise<WarehouseLocationResponseDto> {
    return this.service.activate(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/deactivate')
  deactivate(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: DeactivateLocationDto,
  ): Promise<WarehouseLocationResponseDto> {
    return this.service.deactivate(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/block')
  block(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: BlockLocationDto,
  ): Promise<WarehouseLocationResponseDto> {
    return this.service.block(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ArchiveLocationDto,
  ): Promise<WarehouseLocationResponseDto> {
    return this.service.archive(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/restore')
  restore(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RestoreLocationDto,
  ): Promise<WarehouseLocationResponseDto> {
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
