import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FBAShipmentService } from './fba-shipment.service';
import {
  CreateFBAShipmentDto,
  BuildShipmentFromInventoryDto,
  PlanShipmentDto,
  ApproveShipmentDto,
  PrepareShipmentDto,
  DispatchShipmentDto,
  TrackShipmentDto,
  ReconcileShipmentDto,
  CloseShipmentDto,
  CancelShipmentDto,
  UpdateFBAShipmentItemDto,
  CreateFBAShipmentBoxDto,
  AddBoxContentDto,
  RecordDiscrepancyDto,
  ReconcileDiscrepancyDto,
  FBAShipmentFilterDto,
  AddFBAShipmentItemDto,
} from './dto';

@Controller('fba-shipments')
export class FBAShipmentController {
  constructor(private readonly service: FBAShipmentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateFBAShipmentDto) {
    return this.service.create(dto.marketplaceAccountId, dto);
  }

  @Post('build-from-inventory')
  @HttpCode(HttpStatus.CREATED)
  async buildFromInventory(@Body() dto: BuildShipmentFromInventoryDto) {
    return this.service.buildShipmentFromInventory(
      dto.marketplaceAccountId,
      dto,
    );
  }

  @Get()
  async findAll(@Query() filter: FBAShipmentFilterDto) {
    return this.service.findAll(filter.workspaceId, filter);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/items')
  async getItems(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.service.getItems(id, workspaceId);
  }

  @Get(':id/boxes')
  async getBoxes(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.service.getBoxes(id, workspaceId);
  }

  @Get(':id/discrepancies')
  async getDiscrepancies(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getDiscrepancies(id, workspaceId);
  }

  @Patch(':id/plan')
  @HttpCode(HttpStatus.OK)
  async plan(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: PlanShipmentDto,
  ) {
    return this.service.plan(id, workspaceId, dto);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ApproveShipmentDto,
  ) {
    return this.service.approve(id, workspaceId, dto);
  }

  @Patch(':id/prepare')
  @HttpCode(HttpStatus.OK)
  async prepare(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: PrepareShipmentDto,
  ) {
    return this.service.prepare(id, workspaceId, dto);
  }

  @Patch(':id/dispatch')
  @HttpCode(HttpStatus.OK)
  async dispatch(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: DispatchShipmentDto,
  ) {
    return this.service.dispatch(id, workspaceId, dto);
  }

  @Patch(':id/track')
  @HttpCode(HttpStatus.OK)
  async track(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: TrackShipmentDto,
  ) {
    return this.service.track(id, workspaceId, dto);
  }

  @Patch(':id/reconcile')
  @HttpCode(HttpStatus.OK)
  async reconcile(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ReconcileShipmentDto,
  ) {
    return this.service.reconcile(id, workspaceId, dto);
  }

  @Patch(':id/close')
  @HttpCode(HttpStatus.OK)
  async close(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CloseShipmentDto,
  ) {
    return this.service.close(id, workspaceId, dto);
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CancelShipmentDto,
  ) {
    return this.service.cancel(id, workspaceId, dto);
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  async addItem(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: AddFBAShipmentItemDto,
  ) {
    return this.service.addItem(id, workspaceId, dto);
  }

  @Patch(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateFBAShipmentItemDto,
  ) {
    return this.service.updateItem(id, itemId, workspaceId, dto);
  }

  @Post(':id/boxes')
  @HttpCode(HttpStatus.CREATED)
  async createBox(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateFBAShipmentBoxDto,
  ) {
    return this.service.createBox(id, workspaceId, dto);
  }

  @Post(':id/boxes/:boxId/contents')
  @HttpCode(HttpStatus.CREATED)
  async addBoxContent(
    @Param('id') id: string,
    @Param('boxId') boxId: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: AddBoxContentDto,
  ) {
    return this.service.addBoxContent(id, boxId, workspaceId, dto);
  }

  @Post(':id/discrepancies')
  @HttpCode(HttpStatus.CREATED)
  async recordDiscrepancy(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: RecordDiscrepancyDto,
  ) {
    return this.service.recordDiscrepancy(id, workspaceId, dto);
  }

  @Patch(':id/discrepancies/:discrepancyId/reconcile')
  @HttpCode(HttpStatus.OK)
  async reconcileDiscrepancy(
    @Param('id') id: string,
    @Param('discrepancyId') discrepancyId: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: ReconcileDiscrepancyDto,
  ) {
    return this.service.reconcileDiscrepancy(
      id,
      discrepancyId,
      workspaceId,
      dto,
    );
  }
}
