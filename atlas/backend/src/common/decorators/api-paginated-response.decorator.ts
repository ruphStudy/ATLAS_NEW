import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * @ApiPaginatedResponse
 *
 * Swagger decorator for endpoints that return a paginated list.
 *
 * Usage:
 *   @ApiPaginatedResponse(UserResponseDto)
 *   findAll() { ... }
 */
export function ApiPaginatedResponse<T extends Type<unknown>>(
  itemDto: T,
  description = 'Paginated list',
) {
  return applyDecorators(
    ApiExtraModels(itemDto),
    ApiOkResponse({
      description,
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Success' },
          data: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: { $ref: getSchemaPath(itemDto) },
              },
              total: { type: 'number', example: 100 },
              page: { type: 'number', example: 1 },
              limit: { type: 'number', example: 20 },
            },
          },
          timestamp: { type: 'string', example: '2026-07-14T10:00:00.000Z' },
          requestId: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
          meta: { type: 'object' },
        },
      },
    }),
  );
}
