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
import { PutawayService } from './putaway.service';
import {
  CreatePutawayDto,
  GeneratePutawayFromReceivingDto,
  AssignPutawayDto,
  StartPutawayDto,
  ExecutePutawayDto,
  CompletePutawayDto,
  CancelPutawayDto,
  ReassignPutawayDto,
  ScanLocationDto,
  PutawayFilterDto,
  PutawayResponseDto,
  PutawayListResponseDto,
} from './dto';

@Controller('putaway')
export class PutawayController {
  constructor(private readonly service: PutawayService) {}

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreatePutawayDto,
  ): Promise<PutawayResponseDto> {
    return this.service.create(workspaceId, dto, 'system');
  }

  @Post('generate-from-receiving')
  generateFromReceiving(
    @WorkspaceId() workspaceId: string,
    @Body() dto: GeneratePutawayFromReceivingDto,
  ): Promise<PutawayResponseDto> {
    return this.service.generateFromReceiving(workspaceId, dto, 'system');
  }

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: PutawayFilterDto,
  ): Promise<PutawayListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<PutawayResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Post(':id/assign')
  assign(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: AssignPutawayDto,
  ): Promise<PutawayResponseDto> {
    return this.service.assign(id, workspaceId, dto);
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: StartPutawayDto,
  ): Promise<PutawayResponseDto> {
    return this.service.start(id, workspaceId, dto);
  }

  @Post(':id/execute')
  execute(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ExecutePutawayDto,
  ): Promise<PutawayResponseDto> {
    return this.service.execute(id, workspaceId, dto);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CompletePutawayDto,
  ): Promise<PutawayResponseDto> {
    return this.service.complete(id, workspaceId, dto);
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: CancelPutawayDto,
  ): Promise<PutawayResponseDto> {
    return this.service.cancel(id, workspaceId, dto);
  }

  @Post(':id/reassign')
  reassign(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReassignPutawayDto,
  ): Promise<PutawayResponseDto> {
    return this.service.reassign(id, workspaceId, dto);
  }

  @Post(':id/scan-location')
  @HttpCode(HttpStatus.OK)
  scanLocation(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ScanLocationDto,
  ): Promise<{ success: boolean; message: string }> {
    return this.service.scanLocation(id, workspaceId, dto);
  }
}
