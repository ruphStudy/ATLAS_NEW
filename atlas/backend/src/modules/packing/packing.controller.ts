import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { WorkspaceId } from '@common/decorators';
import { PackingService } from './packing.service';
import {
  CreatePackingDto,
  GeneratePackingFromPickingDto,
  CreatePackageDto,
  AssignPackingDto,
  StartPackingDto,
  PausePackingDto,
  ResumePackingDto,
  ExecutePackingDto,
  UpdatePackageDto,
  CompletePackingDto,
  CancelPackingDto,
  ReopenPackingDto,
  RecordExceptionDto,
  ScanBarcodeDto,
  PackingFilterDto,
  PackingResponseDto,
  PackingListResponseDto,
  PackingPackageResponseDto,
  PackingExceptionResponseDto,
} from './dto';

@Controller('packing')
export class PackingController {
  constructor(private readonly service: PackingService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreatePackingDto,
  ): Promise<PackingResponseDto> {
    return this.service.create(workspaceId, dto, 'system');
  }

  @Post('generate-from-picking')
  generateFromPicking(
    @WorkspaceId() workspaceId: string,
    @Body() dto: GeneratePackingFromPickingDto,
  ): Promise<PackingResponseDto> {
    return this.service.generateFromPicking(workspaceId, dto, 'system');
  }

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: PackingFilterDto,
  ): Promise<PackingListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<PackingResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/packages')
  getPackages(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<PackingPackageResponseDto[]> {
    return this.service.getPackages(id, workspaceId);
  }

  @Get(':id/exceptions')
  getExceptions(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<PackingExceptionResponseDto[]> {
    return this.service.getExceptions(id, workspaceId);
  }

  @Post(':id/assign')
  assign(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: AssignPackingDto,
  ): Promise<PackingResponseDto> {
    return this.service.assign(id, workspaceId, dto);
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: StartPackingDto,
  ): Promise<PackingResponseDto> {
    return this.service.start(id, workspaceId, dto);
  }

  @Post(':id/pause')
  pause(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: PausePackingDto,
  ): Promise<PackingResponseDto> {
    return this.service.pause(id, workspaceId, dto);
  }

  @Post(':id/resume')
  resume(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ResumePackingDto,
  ): Promise<PackingResponseDto> {
    return this.service.resume(id, workspaceId, dto);
  }

  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ExecutePackingDto,
  ): Promise<PackingResponseDto> {
    return this.service.execute(id, workspaceId, dto);
  }

  @Post(':id/packages')
  createPackage(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreatePackageDto,
  ): Promise<PackingPackageResponseDto> {
    return this.service.createPackage(id, workspaceId, dto);
  }

  @Put(':id/packages/:packageId')
  updatePackage(
    @Param('id') id: string,
    @Param('packageId') packageId: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdatePackageDto,
  ): Promise<PackingPackageResponseDto> {
    return this.service.updatePackage(id, packageId, workspaceId, dto);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CompletePackingDto,
  ): Promise<PackingResponseDto> {
    return this.service.complete(id, workspaceId, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CancelPackingDto,
  ): Promise<PackingResponseDto> {
    return this.service.cancel(id, workspaceId, dto);
  }

  @Post(':id/reopen')
  reopen(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReopenPackingDto,
  ): Promise<PackingResponseDto> {
    return this.service.reopen(id, workspaceId, dto);
  }

  @Post(':id/record-exception')
  @HttpCode(HttpStatus.CREATED)
  recordException(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: RecordExceptionDto,
  ): Promise<PackingExceptionResponseDto> {
    return this.service.recordException(id, workspaceId, dto);
  }

  @Post(':id/scan-barcode')
  @HttpCode(HttpStatus.OK)
  scanBarcode(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ScanBarcodeDto,
  ): Promise<{ success: boolean; message: string; data?: unknown }> {
    return this.service.scanBarcode(id, workspaceId, dto);
  }
}
