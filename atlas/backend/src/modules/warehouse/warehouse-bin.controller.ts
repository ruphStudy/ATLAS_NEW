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
import { WarehouseBinService } from './warehouse-bin.service';
import {
  CreateWarehouseBinDto,
  UpdateWarehouseBinDto,
  WarehouseBinFilterDto,
  WarehouseBinResponseDto,
  WarehouseBinListResponseDto,
  WarehouseBinHistoryResponseDto,
  ActivateBinDto,
  DeactivateBinDto,
  BlockBinDto,
  ArchiveBinDto,
  RestoreBinDto,
} from './dto';

@Controller('warehouses/:warehouseId/bins')
export class WarehouseBinController {
  constructor(private readonly service: WarehouseBinService) {}

  @Post()
  create(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateWarehouseBinDto,
  ): Promise<WarehouseBinResponseDto> {
    return this.service.create(warehouseId, workspaceId, dto, userId);
  }

  @Get()
  findAll(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: WarehouseBinFilterDto,
  ): Promise<WarehouseBinListResponseDto> {
    return this.service.findAll(warehouseId, workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WarehouseBinResponseDto> {
    return this.service.findById(id, warehouseId, workspaceId);
  }

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WarehouseBinHistoryResponseDto[]> {
    return this.service.getHistory(id, warehouseId, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateWarehouseBinDto,
  ): Promise<WarehouseBinResponseDto> {
    return this.service.update(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/activate')
  activate(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ActivateBinDto,
  ): Promise<WarehouseBinResponseDto> {
    return this.service.activate(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/deactivate')
  deactivate(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: DeactivateBinDto,
  ): Promise<WarehouseBinResponseDto> {
    return this.service.deactivate(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/block')
  block(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: BlockBinDto,
  ): Promise<WarehouseBinResponseDto> {
    return this.service.block(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ArchiveBinDto,
  ): Promise<WarehouseBinResponseDto> {
    return this.service.archive(id, warehouseId, workspaceId, dto, userId);
  }

  @Post(':id/restore')
  restore(
    @Param('id') id: string,
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RestoreBinDto,
  ): Promise<WarehouseBinResponseDto> {
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
