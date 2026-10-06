import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId } from '@common/decorators';
import { ProductAnalysisService } from './product-analysis.service';
import {
  CreateProductAnalysisDto,
  UpdateProductAnalysisDto,
  FilterProductAnalysisDto,
  ProductAnalysisResponseDto,
} from './dto';

@ApiTags('Product Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('product-analysis')
export class ProductAnalysisController {
  constructor(private readonly analysisService: ProductAnalysisService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new product analysis',
    description: 'Initiates a new analysis for an opportunity. Queue-based execution.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Analysis created and queued successfully',
    type: ProductAnalysisResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async createAnalysis(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateProductAnalysisDto,
  ): Promise<ProductAnalysisResponseDto> {
    return this.analysisService.createAnalysis(workspaceId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all product analyses',
    description: 'Retrieve all analyses with optional filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analyses retrieved successfully',
    type: [ProductAnalysisResponseDto],
  })
  async findAllAnalyses(
    @WorkspaceId() workspaceId: string,
    @Query() filter: FilterProductAnalysisDto,
  ): Promise<{
    data: ProductAnalysisResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.analysisService.findAllAnalyses(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get analysis statistics',
    description: 'Retrieve analysis statistics by status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
  })
  async getAnalysisStats(
    @WorkspaceId() workspaceId: string,
  ): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    return this.analysisService.getAnalysisStats(workspaceId);
  }

  @Get('opportunity/:opportunityId/latest')
  @ApiOperation({
    summary: 'Get latest analysis for an opportunity',
    description: 'Retrieve the latest version of analysis for a specific opportunity',
  })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Latest analysis retrieved',
    type: ProductAnalysisResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'No analysis found' })
  async getLatestByOpportunity(
    @WorkspaceId() workspaceId: string,
    @Param('opportunityId') opportunityId: string,
  ): Promise<ProductAnalysisResponseDto | null> {
    return this.analysisService.findLatestByOpportunity(opportunityId, workspaceId);
  }

  @Post('opportunity/:opportunityId/reanalyze')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Trigger re-analysis',
    description: 'Create a new analysis version for an opportunity',
  })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Re-analysis initiated',
    type: ProductAnalysisResponseDto,
  })
  async triggerReanalysis(
    @WorkspaceId() workspaceId: string,
    @Param('opportunityId') opportunityId: string,
  ): Promise<ProductAnalysisResponseDto> {
    return this.analysisService.triggerReanalysis(opportunityId, workspaceId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get analysis by ID',
    description: 'Retrieve a specific analysis by its ID',
  })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analysis retrieved successfully',
    type: ProductAnalysisResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Analysis not found' })
  async findAnalysisById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<ProductAnalysisResponseDto> {
    return this.analysisService.findAnalysisById(id, workspaceId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update analysis',
    description: 'Update an existing analysis (e.g., manual override)',
  })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analysis updated successfully',
    type: ProductAnalysisResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Analysis not found' })
  async updateAnalysis(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductAnalysisDto,
  ): Promise<ProductAnalysisResponseDto> {
    return this.analysisService.updateAnalysis(id, workspaceId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete analysis',
    description: 'Soft delete an analysis record',
  })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Analysis deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Analysis not found' })
  async deleteAnalysis(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.analysisService.deleteAnalysis(id, workspaceId);
  }
}
