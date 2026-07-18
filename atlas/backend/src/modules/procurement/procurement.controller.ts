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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId, UserId } from '@common/decorators';
import { ProcurementService } from './procurement.service';
import {
  ApproveProcurementDto,
  CancelProcurementDto,
  CreateProcurementDto,
  ProcurementFilterDto,
  ProcurementHistoryResponseDto,
  ProcurementListResponseDto,
  ProcurementResponseDto,
  UpdateProcurementDto,
} from './dto';

@ApiTags('Procurement Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('procurement')
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new procurement (Draft)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProcurementResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Duplicate active procurement' })
  async create(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateProcurementDto,
  ): Promise<ProcurementResponseDto> {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List procurements with filtering, sorting, and pagination' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementListResponseDto })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: ProcurementFilterDto,
  ): Promise<ProcurementListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get procurement statistics by status' })
  @ApiResponse({ status: HttpStatus.OK })
  async getStats(@WorkspaceId() workspaceId: string): Promise<Record<string, number>> {
    return this.service.getStats(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a procurement by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<ProcurementResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a DRAFT procurement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementResponseDto })
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProcurementDto,
  ): Promise<ProcurementResponseDto> {
    return this.service.update(id, workspaceId, dto);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit procurement for approval' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementResponseDto })
  async submitForApproval(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ProcurementResponseDto> {
    return this.service.submitForApproval(id, workspaceId, userId);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending procurement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementResponseDto })
  async approve(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: ApproveProcurementDto,
  ): Promise<ProcurementResponseDto> {
    return this.service.approve(id, workspaceId, userId, dto);
  }

  @Post(':id/order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark procurement as ordered' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementResponseDto })
  async markOrdered(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ProcurementResponseDto> {
    return this.service.markOrdered(id, workspaceId, userId);
  }

  @Post(':id/in-progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark procurement as in progress' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementResponseDto })
  async markInProgress(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ProcurementResponseDto> {
    return this.service.markInProgress(id, workspaceId, userId);
  }

  @Post(':id/partially-received')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark procurement as partially received' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementResponseDto })
  async markPartiallyReceived(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ProcurementResponseDto> {
    return this.service.markPartiallyReceived(id, workspaceId, userId);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark procurement as completed' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementResponseDto })
  async complete(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
  ): Promise<ProcurementResponseDto> {
    return this.service.complete(id, workspaceId, userId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a procurement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProcurementResponseDto })
  async cancel(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @UserId() userId: string,
    @Body() dto: CancelProcurementDto,
  ): Promise<ProcurementResponseDto> {
    return this.service.cancel(id, workspaceId, userId, dto);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get status change history for a procurement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: [ProcurementHistoryResponseDto] })
  async getHistory(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<ProcurementHistoryResponseDto[]> {
    return this.service.getHistory(id, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a DRAFT procurement' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(id, workspaceId);
  }
}
