import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigurationService } from '@config/configuration.service';
import { UsersModule } from '@modules/users/users.module';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { AuthenticationRepository } from './authentication.repository';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigurationService],
      useFactory: (config: ConfigurationService) => {
        const { secret, expiresIn } = config.getJwtConfig();
        return { secret, signOptions: { expiresIn } };
      },
    }),
    UsersModule,
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    AuthenticationRepository,
    JwtStrategy,
    JwtRefreshStrategy,
  ],
  exports: [AuthenticationService, JwtModule],
})
export class AuthenticationModule {}
