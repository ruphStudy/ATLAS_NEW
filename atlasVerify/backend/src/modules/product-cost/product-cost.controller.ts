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
import { WorkspaceId } from '@common/decorators';
import { ProductCostService } from './product-cost.service';
import {
  CreateProductCostDto,
  ProductCostFilterDto,
  ProductCostListResponseDto,
  ProductCostResponseDto,
} from './dto';

@ApiTags('Product Cost Calculator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('product-cost')
export class ProductCostController {
  constructor(private readonly service: ProductCostService) {}

  @Post()
  @ApiOperation({ summary: 'Calculate product landed cost (creates new version on recalculation)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: ProductCostResponseDto })
  async calculate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateProductCostDto,
  ): Promise<ProductCostResponseDto> {
    return this.service.calculate(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List cost calculations with filtering and pagination' })
  @ApiResponse({ status: HttpStatus.OK, type: ProductCostListResponseDto })
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: ProductCostFilterDto,
  ): Promise<ProductCostListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get('product/:productId/latest')
  @ApiOperation({ summary: 'Get latest cost calculation for a product' })
  @ApiParam({ name: 'productId' })
  @ApiResponse({ status: HttpStatus.OK, type: ProductCostResponseDto })
  async findLatestByProduct(
    @WorkspaceId() workspaceId: string,
    @Param('productId') productId: string,
  ): Promise<ProductCostResponseDto> {
    return this.service.findLatestByProduct(productId, workspaceId);
  }

  @Get('product/:productId/history')
  @ApiOperation({ summary: 'Get cost calculation history for a product' })
  @ApiParam({ name: 'productId' })
  @ApiResponse({ status: HttpStatus.OK, type: [ProductCostResponseDto] })
  async findHistoryByProduct(
    @WorkspaceId() workspaceId: string,
    @Param('productId') productId: string,
  ): Promise<ProductCostResponseDto[]> {
    return this.service.findHistoryByProduct(productId, workspaceId);
  }

  @Get('rfq/:rfqId/history')
  @ApiOperation({ summary: 'Get cost calculation history for an RFQ' })
  @ApiParam({ name: 'rfqId' })
  @ApiResponse({ status: HttpStatus.OK, type: [ProductCostResponseDto] })
  async findHistoryByRfq(
    @WorkspaceId() workspaceId: string,
    @Param('rfqId') rfqId: string,
  ): Promise<ProductCostResponseDto[]> {
    return this.service.findHistoryByRfq(rfqId, workspaceId);
  }

  @Get('rfq-supplier/:rfqSupplierId/latest')
  @ApiOperation({ summary: 'Get latest cost calculation for an RFQ supplier response' })
  @ApiParam({ name: 'rfqSupplierId' })
  @ApiResponse({ status: HttpStatus.OK, type: ProductCostResponseDto })
  async findLatestByRfqSupplier(
    @WorkspaceId() workspaceId: string,
    @Param('rfqSupplierId') rfqSupplierId: string,
  ): Promise<ProductCostResponseDto> {
    return this.service.findLatestByRfqSupplier(rfqSupplierId, workspaceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cost calculation by ID' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.OK, type: ProductCostResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND })
  async findById(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<ProductCostResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a cost calculation' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async remove(
    @WorkspaceId() workspaceId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.service.remove(id, workspaceId);
  }
}
