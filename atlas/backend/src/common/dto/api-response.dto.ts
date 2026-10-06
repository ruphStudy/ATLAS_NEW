import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page: number = 0;

  @ApiProperty({ example: 20 })
  limit: number = 0;

  @ApiProperty({ example: 100 })
  total: number = 0;

  @ApiProperty({ example: 5 })
  totalPages: number = 0;

  @ApiProperty({ example: true })
  hasNextPage: boolean = false;

  @ApiProperty({ example: false })
  hasPreviousPage: boolean = false;
}

export class ApiResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean = true;

  @ApiProperty({ example: 'Success' })
  message: string = 'Success';

  @ApiProperty({ type: Object })
  data!: T;

  @ApiPropertyOptional({ type: () => PaginationMetaDto })
  meta?: PaginationMetaDto;
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMetaDto {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
