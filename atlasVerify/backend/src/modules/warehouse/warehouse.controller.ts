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
import { WarehouseService } from './warehouse.service';
import {
  CreateWarehouseDto,
  UpdateWarehouseDto,
  WarehouseFilterDto,
  WarehouseResponseDto,
  WarehouseListResponseDto,
  WarehouseHistoryResponseDto,
  ActivateWarehouseDto,
  DeactivateWarehouseDto,
  SuspendWarehouseDto,
  CloseWarehouseDto,
  ArchiveWarehouseDto,
  RestoreWarehouseDto,
} from './dto';

@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly service: WarehouseService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: WarehouseFilterDto,
  ): Promise<WarehouseListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WarehouseResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/history')
  getHistory(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WarehouseHistoryResponseDto[]> {
    return this.service.getHistory(id, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.service.update(id, workspaceId, dto, userId);
  }

  @Post(':id/activate')
  activate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ActivateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.service.activate(id, workspaceId, dto, userId);
  }

  @Post(':id/deactivate')
  deactivate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: DeactivateWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.service.deactivate(id, workspaceId, dto, userId);
  }

  @Post(':id/suspend')
  suspend(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: SuspendWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.service.suspend(id, workspaceId, dto, userId);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CloseWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.service.close(id, workspaceId, dto, userId);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ArchiveWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.service.archive(id, workspaceId, dto, userId);
  }

  @Post(':id/restore')
  restore(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RestoreWarehouseDto,
  ): Promise<WarehouseResponseDto> {
    return this.service.restore(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<void> {
    return this.service.remove(id, workspaceId);
  }
}
