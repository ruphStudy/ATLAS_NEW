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
import { ProductScoringService } from './product-scoring.service';
import {
  CreateProductScoringDto,
  FilterProductScoringDto,
  ProductScoringResponseDto,
} from './dto';

@ApiTags('Product Scoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('product-scoring')
export class ProductScoringController {
  constructor(private readonly service: ProductScoringService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product score' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductScoringResponseDto })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async createScoring(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateProductScoringDto,
  ): Promise<ProductScoringResponseDto> {
    return this.service.createScoring(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List product scores' })
  @ApiResponse({ status: HttpStatus.OK, type: [ProductScoringResponseDto] })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: FilterProductScoringDto,
  ): Promise<{ data: ProductScoringResponseDto[]; total: number; page: number; limit: number }> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get product scoring statistics' })
  @ApiResponse({ status: HttpStatus.OK })
  async getStats(@WorkspaceId() workspaceId: string) {
    return this.service.getStats(workspaceId);
  }

  @Get('opportunity/:opportunityId/latest')
  @ApiOperation({ summary: 'Get latest product score for an opportunity' })
  @ApiParam({ name: 'opportunityId' })
  @ApiResponse({ status: HttpStatus.OK, type: ProductScoringResponseDto })
  async getLatest(
    @WorkspaceId() workspaceId: string,
    @Param('opportunityId') opportunityId: string,
  ): Promise<ProductScoringResponseDto | null> {
    return this.service.findLatestByOpportunity(opportunityId, workspaceId);
  }

  @Post('opportunity/:opportunityId/rescore')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Trigger manual re-scoring for an opportunity' })
  @ApiParam({ name: 'opportunityId' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductScoringResponseDto })
  async triggerRescoring(
    @WorkspaceId() workspaceId: string,
    @Param('opportunityId') opportunityId: string,
    @Body() dto: Partial<CreateProductScoringDto>,
  ): Promise<ProductScoringResponseDto> {
    return this.service.triggerRescoring(opportunityId, workspaceId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product score by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProductScoringResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Score not found' })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<ProductScoringResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Get(':id/snapshots')
  @ApiOperation({ summary: 'Get scoring history snapshots' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK })
  async getSnapshots(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<Record<string, unknown>[]> {
    return this.service.findSnapshots(id, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a product score' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Score not found' })
  async softDelete(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.softDelete(id, workspaceId);
  }
}
