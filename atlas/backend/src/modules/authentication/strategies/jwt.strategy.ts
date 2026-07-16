import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigurationService } from '@config/configuration.service';
import { AUTH_CONSTANTS } from '../constants';
import type { IJwtPayload } from '../interfaces';

/**
 * JwtStrategy
 *
 * Validates incoming Bearer access tokens on all protected routes.
 * Rejects tokens with type !== 'access' to prevent refresh tokens
 * from being used as access tokens.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, AUTH_CONSTANTS.JWT_STRATEGY) {
  constructor(configService: ConfigurationService) {
    const { secret } = configService.getJwtConfig();

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: IJwtPayload): IJwtPayload {
    if (payload.type !== AUTH_CONSTANTS.ACCESS_TOKEN_TYPE) {
      throw new UnauthorizedException('Invalid token type');
    }
    return payload;
  }
}
