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
import { InventorySerialService } from './inventory-serial.service';
import {
  CreateInventorySerialDto,
  InventorySerialFilterDto,
  UpdateInventorySerialStatusDto,
} from '../dto';

@Controller('inventory/items/:inventoryItemId/serials')
export class InventorySerialController {
  constructor(private readonly service: InventorySerialService) {}

  @Post()
  create(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateInventorySerialDto,
  ) {
    return this.service.create(inventoryItemId, workspaceId, dto);
  }

  @Get()
  findAll(
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @Query() filter: InventorySerialFilterDto,
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

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Param('inventoryItemId') inventoryItemId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateInventorySerialStatusDto,
  ) {
    return this.service.updateStatus(id, inventoryItemId, workspaceId, dto);
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
