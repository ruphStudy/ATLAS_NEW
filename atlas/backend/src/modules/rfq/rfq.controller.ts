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
import { WorkspaceId } from '@common/decorators';
import { RfqService } from './rfq.service';
import {
  CancelRfqDto,
  CloseRfqDto,
  CreateRfqDto,
  RfqFilterDto,
  RfqListResponseDto,
  RfqResponseDto,
  SubmitRfqResponseDto,
  UpdateRfqDto,
} from './dto';

@ApiTags('RFQ Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('rfq')
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new RFQ (Draft)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: RfqResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Duplicate active RFQ' })
  async create(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateRfqDto,
  ): Promise<RfqResponseDto> {
    return this.rfqService.create(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List RFQs with filtering, sorting, and pagination' })
  @ApiResponse({ status: HttpStatus.OK, type: RfqListResponseDto })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: RfqFilterDto,
  ): Promise<RfqListResponseDto> {
    return this.rfqService.findAll(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get RFQ statistics by status' })
  @ApiResponse({ status: HttpStatus.OK })
  async getStats(@WorkspaceId() workspaceId: string): Promise<Record<string, number>> {
    return this.rfqService.getStats(workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get RFQ by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: RfqResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<RfqResponseDto> {
    return this.rfqService.findById(id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a DRAFT RFQ' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: RfqResponseDto })
  async update(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRfqDto,
  ): Promise<RfqResponseDto> {
    return this.rfqService.update(id, workspaceId, dto);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send RFQ to selected suppliers' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: RfqResponseDto })
  async send(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<RfqResponseDto> {
    return this.rfqService.send(id, workspaceId);
  }

  @Post(':rfqId/suppliers/:supplierId/respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit supplier response to an RFQ' })
  @ApiParam({ name: 'rfqId' })
  @ApiParam({ name: 'supplierId' })
  @ApiResponse({ status: HttpStatus.OK, type: RfqResponseDto })
  async submitResponse(
    @WorkspaceId() workspaceId: string,
    @Param('rfqId') rfqId: string,
    @Param('supplierId') supplierId: string,
    @Body() dto: SubmitRfqResponseDto,
  ): Promise<RfqResponseDto> {
    return this.rfqService.submitSupplierResponse(rfqId, supplierId, workspaceId, dto);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an RFQ' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: RfqResponseDto })
  async cancel(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: CancelRfqDto,
  ): Promise<RfqResponseDto> {
    return this.rfqService.cancel(id, workspaceId, dto);
  }

  @Post(':id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an RFQ after selecting a supplier' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: RfqResponseDto })
  async close(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: CloseRfqDto,
  ): Promise<RfqResponseDto> {
    return this.rfqService.close(id, workspaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a DRAFT RFQ' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.rfqService.remove(id, workspaceId);
  }

  @Post(':id/dispatch-via-provider')
  @ApiOperation({ summary: 'Dispatch RFQ to suppliers via provider framework' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK })
  async dispatchViaProvider(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<{ dispatched: number; skipped: number }> {
    return this.rfqService.dispatchViaProvider(id, workspaceId);
  }
}
