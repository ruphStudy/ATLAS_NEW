import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigurationService } from '@config/configuration.service';
import { UsersModule } from '@modules/users/users.module';
import { AuditLogsModule } from '@modules/audit-logs/audit-logs.module';
import { AuthenticationController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';
import { AuthenticationRepository } from './authentication.repository';
import { FailedLoginTracker } from './failed-login.tracker';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { TotpService } from './mfa/totp.service';
import { MfaSecretEncryptor } from './mfa/mfa-secret.encryptor';
import { MfaSecretDecryptor } from './mfa/mfa-secret.decryptor';

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
    AuditLogsModule,
  ],
  controllers: [AuthenticationController],
  providers: [
    AuthenticationService,
    AuthenticationRepository,
    FailedLoginTracker,
    JwtStrategy,
    JwtRefreshStrategy,
    TotpService,
    MfaSecretEncryptor,
    MfaSecretDecryptor,
  ],
  exports: [AuthenticationService, JwtModule],
})
export class AuthenticationModule {}
