import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { WorkspaceId } from '@common/decorators';
import { PickingService } from './picking.service';
import {
  CreatePickingDto,
  GeneratePickingFromOrderDto,
  GeneratePickingFromTransferDto,
  AssignPickingDto,
  ReleasePickingDto,
  StartPickingDto,
  PausePickingDto,
  ResumePickingDto,
  ExecutePickingDto,
  CompletePickingDto,
  CancelPickingDto,
  ReassignPickingDto,
  RecordExceptionDto,
  ScanBarcodeDto,
  PickingFilterDto,
  PickingResponseDto,
  PickingListResponseDto,
  PickingExceptionResponseDto,
} from './dto';

@Controller('picking')
export class PickingController {
  constructor(private readonly service: PickingService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreatePickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.create(workspaceId, dto, 'system');
  }

  @Post('generate-from-order')
  generateFromOrder(
    @WorkspaceId() workspaceId: string,
    @Body() dto: GeneratePickingFromOrderDto,
  ): Promise<PickingResponseDto> {
    return this.service.generateFromOrder(workspaceId, dto, 'system');
  }

  @Post('generate-from-transfer')
  generateFromTransfer(
    @WorkspaceId() workspaceId: string,
    @Body() dto: GeneratePickingFromTransferDto,
  ): Promise<PickingResponseDto> {
    return this.service.generateFromTransfer(workspaceId, dto, 'system');
  }

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: PickingFilterDto,
  ): Promise<PickingListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<PickingResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/exceptions')
  getExceptions(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<PickingExceptionResponseDto[]> {
    return this.service.getExceptions(id, workspaceId);
  }

  @Post(':id/assign')
  assign(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: AssignPickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.assign(id, workspaceId, dto);
  }

  @Post(':id/release')
  release(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReleasePickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.release(id, workspaceId, dto);
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: StartPickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.start(id, workspaceId, dto);
  }

  @Post(':id/pause')
  pause(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: PausePickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.pause(id, workspaceId, dto);
  }

  @Post(':id/resume')
  resume(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ResumePickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.resume(id, workspaceId, dto);
  }

  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ExecutePickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.execute(id, workspaceId, dto);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CompletePickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.complete(id, workspaceId, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CancelPickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.cancel(id, workspaceId, dto);
  }

  @Post(':id/reassign')
  reassign(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReassignPickingDto,
  ): Promise<PickingResponseDto> {
    return this.service.reassign(id, workspaceId, dto);
  }

  @Post(':id/record-exception')
  @HttpCode(HttpStatus.CREATED)
  recordException(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: RecordExceptionDto,
  ): Promise<PickingExceptionResponseDto> {
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
