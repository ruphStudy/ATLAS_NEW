import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtRefreshGuard
 *
 * Used exclusively on POST /auth/refresh.
 * Delegates to JwtRefreshStrategy which validates the refresh token
 * and verifies the stored hash before allowing rotation.
 */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
