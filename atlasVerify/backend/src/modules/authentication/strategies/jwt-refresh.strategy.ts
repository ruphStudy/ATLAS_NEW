import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { ConfigurationService } from '@config/configuration.service';
import { UsersRepository } from '@modules/users/users.repository';
import { AUTH_CONSTANTS } from '../constants';
import type { IJwtPayload } from '../interfaces';

/**
 * JwtRefreshStrategy
 *
 * Validates the refresh token submitted to POST /auth/refresh.
 * Performs three checks:
 *   1. Token signature is valid (passport-jwt).
 *   2. Token type is 'refresh'.
 *   3. The stored bcrypt hash matches the submitted token (rotation guard).
 *
 * Attaches the full Prisma User to request.user for the controller.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  AUTH_CONSTANTS.JWT_REFRESH_STRATEGY,
) {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly usersRepository: UsersRepository,
  ) {
    const { refreshSecret } = configService.getJwtConfig();

    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: refreshSecret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: IJwtPayload): Promise<unknown> {
    if (payload.type !== AUTH_CONSTANTS.REFRESH_TOKEN_TYPE) {
      throw new UnauthorizedException('Invalid token type');
    }

    const refreshToken = (req.body as { refreshToken?: string })?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const user = await this.usersRepository.findById(payload.sub);
    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Access denied – please log in again');
    }

    const isValid = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return user;
  }
}
