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
import { WorkspaceId } from '@common/decorators';
import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InventoryBatchService } from './inventory-batch.service';
import {
  CreateInventoryBatchDto,
  InventoryBatchFilterDto,
  UpdateInventoryBatchDto,
} from '../dto';

class ExpiringBatchQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  days?: number = 30;
}

@Controller('inventory/batches')
export class InventoryBatchQueryController {
  constructor(private readonly service: InventoryBatchService) {}

  @Get('expiring')
  findExpiring(@WorkspaceId() workspaceId: string, @Query() query: ExpiringBatchQueryDto) {
    return this.service.findExpiring(workspaceId, query.days ?? 30);
  }
}

@Controller('inventory/items/:inventoryItemId/batches')
export class InventoryBatchController {
  constructor(private readonly service: InventoryBatchService) {}

  @Post()
  create(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateInventoryBatchDto,
  ) {
    return this.service.create(inventoryItemId, workspaceId, dto);
  }

  @Get()
  findAll(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: InventoryBatchFilterDto,
  ) {
    return this.service.findAll(inventoryItemId, workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.findById(id, inventoryItemId, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateInventoryBatchDto,
  ) {
    return this.service.update(id, inventoryItemId, workspaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.service.remove(id, inventoryItemId, workspaceId);
  }
}
