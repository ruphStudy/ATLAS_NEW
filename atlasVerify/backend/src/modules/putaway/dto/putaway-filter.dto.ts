import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { PutawayStatus, PutawayStrategy } from '../interfaces';

export class PutawayFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(PutawayStatus)
  status?: PutawayStatus;

  @IsOptional()
  @IsEnum(PutawayStrategy)
  strategy?: PutawayStrategy;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  receivingId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}
