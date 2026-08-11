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
import { ReceivingService } from './receiving.service';
import {
  CreateReceivingDto,
  UpdateReceivingDto,
  StartReceivingDto,
  ReceiveLinesDto,
  CompleteReceivingDto,
  CancelReceivingDto,
  ReopenReceivingDto,
  ScanPackageDto,
  ReceivingFilterDto,
  ReceivingResponseDto,
  ReceivingListResponseDto,
} from './dto';

@Controller('warehouse-receiving')
export class ReceivingController {
  constructor(private readonly service: ReceivingService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateReceivingDto,
  ): Promise<ReceivingResponseDto> {
    return this.service.create(workspaceId, dto, 'system');
  }

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: ReceivingFilterDto,
  ): Promise<ReceivingListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<ReceivingResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateReceivingDto,
  ): Promise<ReceivingResponseDto> {
    return this.service.update(id, workspaceId, dto);
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: StartReceivingDto,
  ): Promise<ReceivingResponseDto> {
    return this.service.start(id, workspaceId, dto);
  }

  @Post(':id/receive-lines')
  receiveLines(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReceiveLinesDto,
  ): Promise<ReceivingResponseDto> {
    return this.service.receiveLines(id, workspaceId, dto);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CompleteReceivingDto,
  ): Promise<ReceivingResponseDto> {
    return this.service.complete(id, workspaceId, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CancelReceivingDto,
  ): Promise<ReceivingResponseDto> {
    return this.service.cancel(id, workspaceId, dto);
  }

  @Post(':id/reopen')
  reopen(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReopenReceivingDto,
  ): Promise<ReceivingResponseDto> {
    return this.service.reopen(id, workspaceId, dto);
  }

  @Post(':id/scan-package')
  @HttpCode(HttpStatus.OK)
  scanPackage(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ScanPackageDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.service.scanPackage(id, workspaceId, dto);
  }
}
