import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { WorkspaceId } from '@common/decorators';
import { DispatchService } from './dispatch.service';
import {
  CreateDispatchDto,
  GenerateDispatchFromPackingDto,
  AssignDispatchDto,
  StartDispatchDto,
  ExecuteDispatchDto,
  UpdateDispatchDto,
  CompleteDispatchDto,
  CancelDispatchDto,
  ReopenDispatchDto,
  RecordExceptionDto,
  ScanBarcodeDto,
  DispatchFilterDto,
  DispatchResponseDto,
  DispatchListResponseDto,
  DispatchPackageResponseDto,
  DispatchExceptionResponseDto,
} from './dto';

@Controller('dispatch')
export class DispatchController {
  constructor(private readonly service: DispatchService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateDispatchDto,
  ): Promise<DispatchResponseDto> {
    return this.service.create(workspaceId, dto, 'system');
  }

  @Post('generate-from-packing')
  generateFromPacking(
    @WorkspaceId() workspaceId: string,
    @Body() dto: GenerateDispatchFromPackingDto,
  ): Promise<DispatchResponseDto> {
    return this.service.generateFromPacking(workspaceId, dto, 'system');
  }

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: DispatchFilterDto,
  ): Promise<DispatchListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<DispatchResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/packages')
  getPackages(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<DispatchPackageResponseDto[]> {
    return this.service.getPackages(id, workspaceId);
  }

  @Get(':id/exceptions')
  getExceptions(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<DispatchExceptionResponseDto[]> {
    return this.service.getExceptions(id, workspaceId);
  }

  @Post(':id/assign')
  assign(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: AssignDispatchDto,
  ): Promise<DispatchResponseDto> {
    return this.service.assign(id, workspaceId, dto);
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: StartDispatchDto,
  ): Promise<DispatchResponseDto> {
    return this.service.start(id, workspaceId, dto);
  }

  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ExecuteDispatchDto,
  ): Promise<DispatchResponseDto> {
    return this.service.execute(id, workspaceId, dto);
  }

  @Patch(':id')
  updateDispatch(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateDispatchDto,
  ): Promise<DispatchResponseDto> {
    return this.service.updateDispatch(id, workspaceId, dto);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CompleteDispatchDto,
  ): Promise<DispatchResponseDto> {
    return this.service.complete(id, workspaceId, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CancelDispatchDto,
  ): Promise<DispatchResponseDto> {
    return this.service.cancel(id, workspaceId, dto);
  }

  @Post(':id/reopen')
  reopen(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReopenDispatchDto,
  ): Promise<DispatchResponseDto> {
    return this.service.reopen(id, workspaceId, dto);
  }

  @Post(':id/record-exception')
  @HttpCode(HttpStatus.CREATED)
  recordException(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: RecordExceptionDto,
  ): Promise<DispatchExceptionResponseDto> {
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
