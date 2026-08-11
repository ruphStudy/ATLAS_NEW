import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { WorkspaceId } from '@common/decorators';
import { WarehouseCapacityService } from './warehouse-capacity.service';
import {
  ReserveCapacityDto,
  ReleaseCapacityDto,
  RecalculateCapacityDto,
  CapacitySnapshotDto,
  WarehouseCapacityResponseDto,
  ZoneCapacitySummaryDto,
  LocationCapacityResponseDto,
  BinCapacityResponseDto,
  CapacityReservationResponseDto,
} from './dto';

@Controller('warehouses/:warehouseId/capacity')
export class WarehouseCapacityController {
  constructor(private readonly service: WarehouseCapacityService) {}

  @Get()
  getWarehouseCapacity(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<WarehouseCapacityResponseDto> {
    return this.service.getWarehouseCapacity(warehouseId, workspaceId);
  }

  @Get('zones/:zoneId')
  getZoneCapacity(
    @Param('warehouseId') warehouseId: string,
    @Param('zoneId') zoneId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<ZoneCapacitySummaryDto> {
    return this.service.getZoneCapacity(zoneId, warehouseId, workspaceId);
  }

  @Get('locations/:locationId')
  getLocationCapacity(
    @Param('warehouseId') warehouseId: string,
    @Param('locationId') locationId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<LocationCapacityResponseDto> {
    return this.service.getLocationCapacity(locationId, warehouseId, workspaceId);
  }

  @Get('bins/:binId')
  getBinCapacity(
    @Param('warehouseId') warehouseId: string,
    @Param('binId') binId: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<BinCapacityResponseDto> {
    return this.service.getBinCapacity(binId, warehouseId, workspaceId);
  }

  @Post('reserve')
  reserve(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReserveCapacityDto,
  ): Promise<CapacityReservationResponseDto> {
    return this.service.reserve(warehouseId, workspaceId, dto);
  }

  @Post('release')
  release(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReleaseCapacityDto,
  ): Promise<{ released: number }> {
    return this.service.release(warehouseId, workspaceId, dto);
  }

  @Post('recalculate')
  recalculate(
    @Param('warehouseId') warehouseId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: RecalculateCapacityDto,
  ): Promise<CapacitySnapshotDto> {
    return this.service.recalculate(warehouseId, workspaceId, dto);
  }
}
