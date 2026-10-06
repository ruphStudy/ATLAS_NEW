import { PartialType } from '@nestjs/swagger';
import { CreateProductCostDto } from './create-product-cost.dto';

export class UpdateProductCostDto extends PartialType(CreateProductCostDto) {}
