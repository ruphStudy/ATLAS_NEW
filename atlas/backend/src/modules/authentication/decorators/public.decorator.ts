import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants';

/**
 * @Public()
 *
 * Marks a controller or route handler as publicly accessible.
 * The global JwtAuthGuard skips JWT validation for decorated routes.
 *
 * Usage:
 *   @Public()
 *   @Post('login')
 *   async login(...) {}
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
