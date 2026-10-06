import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * TrimPipe
 *
 * Trims leading/trailing whitespace from all string fields in a DTO.
 * Apply at controller method level for body/query parameters.
 *
 * Usage:
 *   @Body(TrimPipe) dto: CreateUserDto
 */
@Injectable()
export class TrimPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (typeof value === 'string') return value.trim();

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([k, v]) => [
          k,
          typeof v === 'string' ? v.trim() : v,
        ]),
      );
    }

    return value;
  }
}

/**
 * ParsePositiveIntPipe
 *
 * Parses and validates a query parameter as a positive integer.
 */
@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) {
      throw new BadRequestException(`'${value}' is not a valid positive integer`);
    }
    return num;
  }
}
