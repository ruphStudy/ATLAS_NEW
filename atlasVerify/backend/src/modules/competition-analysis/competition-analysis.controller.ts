import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@modules/authentication/guards';
import { WorkspaceId } from '@common/decorators/workspace.decorator';
import { CompetitionAnalysisService } from './competition-analysis.service';
import {
  CreateCompetitionAnalysisDto,
  FilterCompetitionAnalysisDto,
  CompetitionAnalysisResponseDto,
} from './dto';
import { CompetitionProvider } from './interfaces';

@ApiTags('Competition Analysis')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('competition-analysis')
export class CompetitionAnalysisController {
  constructor(private readonly service: CompetitionAnalysisService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new competition analysis' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: CompetitionAnalysisResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async createAnalysis(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateCompetitionAnalysisDto,
  ): Promise<CompetitionAnalysisResponseDto> {
    return this.service.createAnalysis(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List competition analyses' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [CompetitionAnalysisResponseDto],
  })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: FilterCompetitionAnalysisDto,
  ): Promise<{
    data: CompetitionAnalysisResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get competition analysis statistics' })
  @ApiResponse({ status: HttpStatus.OK })
  async getStats(
    @WorkspaceId() workspaceId: string,
  ): Promise<{
    total: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
  }> {
    return this.service.getStats(workspaceId);
  }

  @Get('opportunity/:opportunityId/latest')
  @ApiOperation({ summary: 'Get latest competition analysis for an opportunity' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CompetitionAnalysisResponseDto,
  })
  async getLatest(
    @WorkspaceId() workspaceId: string,
    @Param('opportunityId') opportunityId: string,
  ): Promise<CompetitionAnalysisResponseDto | null> {
    return this.service.findLatestByOpportunity(opportunityId, workspaceId);
  }

  @Post('opportunity/:opportunityId/reanalyze')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Trigger re-analysis for an opportunity' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity ID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: CompetitionAnalysisResponseDto,
  })
  async triggerReanalysis(
    @WorkspaceId() workspaceId: string,
    @Param('opportunityId') opportunityId: string,
  ): Promise<CompetitionAnalysisResponseDto> {
    return this.service.triggerReanalysis(opportunityId, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get competition analysis by ID' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CompetitionAnalysisResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Analysis not found' })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<CompetitionAnalysisResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/snapshots')
  @ApiOperation({ summary: 'Get analysis snapshots (history)' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({ status: HttpStatus.OK })
  async getSnapshots(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.findSnapshots(id, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a competition analysis' })
  @ApiParam({ name: 'id', description: 'Analysis ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Analysis not found' })
  async softDelete(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.softDelete(id, workspaceId);
  }
}
