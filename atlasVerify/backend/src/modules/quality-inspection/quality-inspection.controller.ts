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
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId } from '@common/decorators';
import { UserId } from '@common/decorators';
import { QualityInspectionService } from './quality-inspection.service';
import {
  CloseInspectionDto,
  CompleteInspectionDto,
  ConditionalApprovalDto,
  CreateQualityInspectionDto,
  QualityInspectionFilterDto,
  RejectInspectionDto,
  RequestReInspectionDto,
  ScheduleInspectionDto,
  StartInspectionDto,
  UpdateQualityInspectionDto,
} from './dto';

@UseGuards(JwtAuthGuard)
@Controller('quality-inspections')
export class QualityInspectionController {
  constructor(private readonly service: QualityInspectionService) {}

  // ── Create ───────────────────────────────────────────────────

  @Post()
  create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateQualityInspectionDto,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  // ── List & Stats ─────────────────────────────────────────────

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: QualityInspectionFilterDto,
  ) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  getStats(@WorkspaceId() workspaceId: string) {
    return this.service.getStats(workspaceId);
  }

  // ── Single ───────────────────────────────────────────────────

  @Get(':id')
  findById(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.getHistory(id, workspaceId);
  }

  // ── Update ───────────────────────────────────────────────────

  @Patch(':id')
  update(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateQualityInspectionDto,
  ) {
    return this.service.update(id, workspaceId, dto);
  }

  // ── Actions ──────────────────────────────────────────────────

  @Post(':id/schedule')
  schedule(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ScheduleInspectionDto,
  ) {
    return this.service.schedule(id, workspaceId, dto, userId);
  }

  @Post(':id/start')
  start(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: StartInspectionDto,
  ) {
    return this.service.start(id, workspaceId, dto, userId);
  }

  @Post(':id/complete')
  complete(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CompleteInspectionDto,
  ) {
    return this.service.complete(id, workspaceId, dto, userId);
  }

  @Post(':id/conditional-approval')
  conditionallyApprove(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: ConditionalApprovalDto,
  ) {
    return this.service.conditionallyApprove(id, workspaceId, dto, userId);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RejectInspectionDto,
  ) {
    return this.service.reject(id, workspaceId, dto, userId);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CloseInspectionDto,
  ) {
    return this.service.close(id, workspaceId, dto, userId);
  }

  @Post(':id/re-inspect')
  requestReInspection(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: RequestReInspectionDto,
  ) {
    return this.service.requestReInspection(id, workspaceId, dto, userId);
  }

  // ── Delete ───────────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @WorkspaceId() workspaceId: string) {
    return this.service.remove(id, workspaceId);
  }
}
