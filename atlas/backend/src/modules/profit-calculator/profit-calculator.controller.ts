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
import { WorkspaceId } from '@common/decorators';
import { ProfitCalculatorService } from './profit-calculator.service';
import {
  CreateProfitCalculationDto,
  FilterProfitCalculationDto,
  ProfitCalculationResponseDto,
} from './dto';

@ApiTags('Profit Calculator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profit-calculator')
export class ProfitCalculatorController {
  constructor(private readonly service: ProfitCalculatorService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new profit calculation' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProfitCalculationResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async createCalculation(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateProfitCalculationDto,
  ): Promise<ProfitCalculationResponseDto> {
    return this.service.createCalculation(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List profit calculations' })
  @ApiResponse({ status: HttpStatus.OK, type: [ProfitCalculationResponseDto] })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: FilterProfitCalculationDto,
  ): Promise<{ data: ProfitCalculationResponseDto[]; total: number; page: number; limit: number }> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get profit calculation statistics' })
  @ApiResponse({ status: HttpStatus.OK })
  async getStats(@WorkspaceId() workspaceId: string) {
    return this.service.getStats(workspaceId);
  }

  @Get('opportunity/:opportunityId/latest')
  @ApiOperation({ summary: 'Get latest profit calculation for an opportunity' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ProfitCalculationResponseDto })
  async getLatest(
    @WorkspaceId() workspaceId: string,
    @Param('opportunityId') opportunityId: string,
  ): Promise<ProfitCalculationResponseDto | null> {
    return this.service.findLatestByOpportunity(opportunityId, workspaceId);
  }

  @Post('opportunity/:opportunityId/recalculate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Trigger profit recalculation for an opportunity' })
  @ApiParam({ name: 'opportunityId', description: 'Opportunity ID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProfitCalculationResponseDto })
  async triggerRecalculation(
    @WorkspaceId() workspaceId: string,
    @Param('opportunityId') opportunityId: string,
  ): Promise<ProfitCalculationResponseDto> {
    return this.service.triggerRecalculation(opportunityId, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get profit calculation by ID' })
  @ApiParam({ name: 'id', description: 'Calculation ID' })
  @ApiResponse({ status: HttpStatus.OK, type: ProfitCalculationResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Calculation not found' })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<ProfitCalculationResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/snapshots')
  @ApiOperation({ summary: 'Get calculation snapshots (history)' })
  @ApiParam({ name: 'id', description: 'Calculation ID' })
  @ApiResponse({ status: HttpStatus.OK })
  async getSnapshots(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.findSnapshots(id, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a profit calculation' })
  @ApiParam({ name: 'id', description: 'Calculation ID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Calculation not found' })
  async softDelete(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.softDelete(id, workspaceId);
  }
}
