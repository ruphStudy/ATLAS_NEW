import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { QuotationComparisonService } from './quotation-comparison.service';
import {
  CreateQuotationComparisonDto,
  QuotationComparisonFilterDto,
  QuotationComparisonListResponseDto,
  QuotationComparisonResponseDto,
  SelectSupplierDto,
} from './dto';

@ApiTags('Quotation Comparison')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('quotation-comparison')
export class QuotationComparisonController {
  constructor(private readonly service: QuotationComparisonService) {}

  @Post()
  @ApiOperation({ summary: 'Run quotation comparison for a responded RFQ' })
  @ApiResponse({ status: HttpStatus.CREATED, type: QuotationComparisonResponseDto })
  async compare(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateQuotationComparisonDto,
  ): Promise<QuotationComparisonResponseDto> {
    return this.service.compare(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List quotation comparisons with filtering and pagination' })
  @ApiResponse({ status: HttpStatus.OK, type: QuotationComparisonListResponseDto })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: QuotationComparisonFilterDto,
  ): Promise<QuotationComparisonListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get quotation comparison statistics by status' })
  @ApiResponse({ status: HttpStatus.OK })
  async getStats(@WorkspaceId() workspaceId: string): Promise<Record<string, number>> {
    return this.service.getStats(workspaceId);
  }

  @Get('rfq/:rfqId/latest')
  @ApiOperation({ summary: 'Get the latest comparison for an RFQ' })
  @ApiParam({ name: 'rfqId' })
  @ApiResponse({ status: HttpStatus.OK, type: QuotationComparisonResponseDto })
  async findLatestByRfq(
    @WorkspaceId() workspaceId: string,
    @Param('rfqId') rfqId: string,
  ): Promise<QuotationComparisonResponseDto> {
    return this.service.findLatestByRfq(rfqId, workspaceId);
  }

  @Get('rfq/:rfqId/history')
  @ApiOperation({ summary: 'Get comparison history for an RFQ (all versions)' })
  @ApiParam({ name: 'rfqId' })
  @ApiResponse({ status: HttpStatus.OK, type: [QuotationComparisonResponseDto] })
  async findHistory(
    @WorkspaceId() workspaceId: string,
    @Param('rfqId') rfqId: string,
  ): Promise<QuotationComparisonResponseDto[]> {
    return this.service.findHistory(rfqId, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a quotation comparison by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: QuotationComparisonResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<QuotationComparisonResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Post(':id/select-supplier')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Manually select winning supplier for a comparison' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: QuotationComparisonResponseDto })
  async selectSupplier(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: SelectSupplierDto,
    @UserId() userId: string,
  ): Promise<QuotationComparisonResponseDto> {
    return this.service.selectSupplier(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a quotation comparison' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(id, workspaceId);
  }
}
