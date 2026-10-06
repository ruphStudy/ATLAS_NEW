import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticationService } from '../authentication.service';
import { AuthenticationRepository } from '../authentication.repository';
import { UsersRepository } from '@modules/users/users.repository';
import { ConfigurationService } from '@config/configuration.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { FailedLoginTracker } from '../failed-login.tracker';
import { TotpService } from '../mfa/totp.service';
import { MfaSecretEncryptor } from '../mfa/mfa-secret.encryptor';
import { MfaSecretDecryptor } from '../mfa/mfa-secret.decryptor';
import type { AuthResponseDto, MfaChallengeResponseDto } from '../dto';

// ── Mock bcrypt ───────────────────────────────────────────────
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcryptjs';
const mockedBcrypt = jest.mocked(bcrypt);

// ── Mock uuid ────────────────────────────────────────────────
jest.mock('uuid', () => ({ v4: () => 'aaaabbbb-cccc-dddd-eeee-ffffgggghhhh' }));

/** Narrows a login() result to the full-tokens shape in tests that expect MFA-off success. */
function asAuthResponse(result: AuthResponseDto | MfaChallengeResponseDto): AuthResponseDto {
  if ('mfaRequired' in result) {
    throw new Error('Expected a full AuthResponseDto, got an MFA challenge');
  }
  return result;
}

// ── Mock data ─────────────────────────────────────────────────
const NOW = new Date();

const MOCK_USER = {
  id: 'user-uuid',
  email: 'john@acmecorp.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'OWNER',
  workspaceId: 'ws-uuid',
  status: 'ACTIVE',
  passwordHash: '$2b$12$hashedpassword',
  refreshTokenHash: null,
  isPlatformAdmin: false,
  avatarUrl: null,
  phone: null,
  timezone: 'UTC',
  locale: 'en-US',
  lastLoginAt: null,
  emailVerifiedAt: null,
  passwordChangedAt: NOW,
  mfaSecret: null as string | null,
  mfaEnabled: false,
  mfaEnabledAt: null as Date | null,
  metadata: {},
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
};

const MOCK_JWT_CONFIG = {
  secret: 'test-secret-32-chars-long-minimum!',
  expiresIn: '15m',
  refreshSecret: 'test-refresh-32-chars-long-minimum',
  refreshExpiresIn: '7d',
};

// ── Test Suite ────────────────────────────────────────────────
describe('AuthenticationService', () => {
  let service: AuthenticationService;
  let authRepo: jest.Mocked<AuthenticationRepository>;
  let usersRepo: jest.Mocked<UsersRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let auditLogsService: jest.Mocked<AuditLogsService>;
  let totpService: jest.Mocked<TotpService>;
  let mfaSecretEncryptor: jest.Mocked<MfaSecretEncryptor>;
  let mfaSecretDecryptor: jest.Mocked<MfaSecretDecryptor>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthenticationService,
        {
          provide: AuthenticationRepository,
          useValue: {
            createUserWithWorkspace: jest.fn(),
            updateRefreshToken: jest.fn().mockResolvedValue(undefined),
            updateLastLogin: jest.fn().mockResolvedValue(undefined),
            updatePassword: jest.fn().mockResolvedValue(undefined),
            setPendingMfaSecret: jest.fn().mockResolvedValue(undefined),
            enableMfa: jest.fn().mockResolvedValue(undefined),
            disableMfa: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue('mock.jwt.token'),
            verifyAsync: jest.fn(),
          },
        },
        {
          provide: ConfigurationService,
          useValue: { getJwtConfig: () => MOCK_JWT_CONFIG },
        },
        {
          provide: AuditLogsService,
          useValue: { record: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: FailedLoginTracker,
          useValue: {
            isLocked: jest.fn().mockReturnValue(false),
            recordFailure: jest.fn(),
            reset: jest.fn(),
          },
        },
        {
          provide: TotpService,
          useValue: {
            generateSecret: jest.fn().mockReturnValue('MOCKSECRETBASE32'),
            generateOtpAuthUrl: jest.fn().mockReturnValue('otpauth://totp/ATLAS:john@acmecorp.com?secret=MOCKSECRETBASE32&issuer=ATLAS'),
            verifyToken: jest.fn().mockReturnValue(true),
          },
        },
        {
          provide: MfaSecretEncryptor,
          useValue: { encryptValue: jest.fn().mockReturnValue('v1:iv:tag:ciphertext') },
        },
        {
          provide: MfaSecretDecryptor,
          useValue: { decryptValue: jest.fn().mockReturnValue('MOCKSECRETBASE32') },
        },
      ],
    }).compile();

    service = module.get(AuthenticationService);
    authRepo = module.get(AuthenticationRepository);
    usersRepo = module.get(UsersRepository);
    jwtService = module.get(JwtService);
    auditLogsService = module.get(AuditLogsService);
    totpService = module.get(TotpService);
    mfaSecretEncryptor = module.get(MfaSecretEncryptor);
    mfaSecretDecryptor = module.get(MfaSecretDecryptor);
  });

  beforeEach(() => {
    mockedBcrypt.hash.mockResolvedValue('hashed_value' as never);
    mockedBcrypt.compare.mockResolvedValue(true as never);
  });

  afterEach(() => jest.clearAllMocks());

  // ── register() ───────────────────────────────────────────────
  describe('register()', () => {
    const dto = {
      email: 'john@acmecorp.com',
      password: 'Str0ng!Pass',
      firstName: 'John',
      lastName: 'Doe',
      workspaceName: 'Acme Corp',
    };

    beforeEach(() => {
      usersRepo.findByEmail.mockResolvedValue(null);
      authRepo.createUserWithWorkspace.mockResolvedValue(MOCK_USER as never);
    });

    it('should return access and refresh tokens', async () => {
      const result = await service.register(dto);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should return sanitized user (no passwordHash)', async () => {
      const result = await service.register(dto);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('refreshTokenHash');
    });

    it('should hash the password before storing', async () => {
      await service.register(dto);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        dto.password,
        expect.any(Number),
      );
    });

    it('should throw ConflictException when email is already registered', async () => {
      usersRepo.findByEmail.mockResolvedValue(MOCK_USER as never);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('should create user with correct workspace name', async () => {
      await service.register(dto);
      expect(authRepo.createUserWithWorkspace).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceName: 'Acme Corp' }),
      );
    });

    it('should store hashed refresh token after registration', async () => {
      await service.register(dto);
      expect(authRepo.updateRefreshToken).toHaveBeenCalledWith(
        MOCK_USER.id,
        'hashed_value',
      );
    });
  });

  // ── login() — existing MFA-off behavior (regression) ─────────
  describe('login() — MFA-off (regression)', () => {
    const dto = { email: 'john@acmecorp.com', password: 'Str0ng!Pass' };

    beforeEach(() => {
      usersRepo.findByEmail.mockResolvedValue(MOCK_USER as never);
    });

    it('should return tokens and sanitized user on success (unchanged MFA-off behavior)', async () => {
      const result = asAuthResponse(await service.login(dto));
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(MOCK_USER.email);
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException for unknown email', async () => {
      usersRepo.findByEmail.mockResolvedValue(null);
      mockedBcrypt.compare.mockResolvedValue(false as never);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockedBcrypt.compare.mockResolvedValue(false as never);
      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for SUSPENDED account', async () => {
      usersRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, status: 'SUSPENDED' } as never);
      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException for INACTIVE account', async () => {
      usersRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, status: 'INACTIVE' } as never);
      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
    });

    it('should update lastLoginAt on successful login', async () => {
      await service.login(dto);
      expect(authRepo.updateLastLogin).toHaveBeenCalledWith(MOCK_USER.id);
    });

    it('should call signAsync twice (access + refresh tokens)', async () => {
      await service.login(dto);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should never call the MFA challenge path when MFA is off', async () => {
      const result = await service.login(dto);
      expect('mfaRequired' in result).toBe(false);
    });
  });

  // ── login() — password expiry ─────────────────────────────────
  describe('login() — password expiry', () => {
    const dto = { email: 'john@acmecorp.com', password: 'Str0ng!Pass' };

    it('should throw ForbiddenException when passwordChangedAt is older than MAX_PASSWORD_AGE_DAYS', async () => {
      const expiredDate = new Date(Date.now() - 366 * 24 * 60 * 60 * 1000);
      usersRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, passwordChangedAt: expiredDate } as never);
      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when passwordChangedAt is null (treated as expired)', async () => {
      usersRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, passwordChangedAt: null } as never);
      await expect(service.login(dto)).rejects.toThrow(ForbiddenException);
    });

    it('should succeed when passwordChangedAt is within MAX_PASSWORD_AGE_DAYS', async () => {
      const recentDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      usersRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, passwordChangedAt: recentDate } as never);
      const result = asAuthResponse(await service.login(dto));
      expect(result.accessToken).toBeDefined();
    });

    it('should not issue tokens when password is expired', async () => {
      usersRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, passwordChangedAt: null } as never);
      await expect(service.login(dto)).rejects.toThrow();
      expect(authRepo.updateRefreshToken).not.toHaveBeenCalled();
    });
  });

  // ── login() — MFA challenge ───────────────────────────────────
  describe('login() — MFA enabled', () => {
    const dto = { email: 'john@acmecorp.com', password: 'Str0ng!Pass' };
    const MFA_USER = { ...MOCK_USER, mfaEnabled: true, mfaSecret: 'v1:iv:tag:ciphertext' };

    beforeEach(() => {
      usersRepo.findByEmail.mockResolvedValue(MFA_USER as never);
    });

    it('should return a challenge instead of tokens', async () => {
      const result = await service.login(dto);
      expect(result).toMatchObject({ mfaRequired: true, challenge: 'mock.jwt.token' });
    });

    it('should not issue access/refresh tokens or update lastLoginAt at this stage', async () => {
      await service.login(dto);
      expect(authRepo.updateRefreshToken).not.toHaveBeenCalled();
      expect(authRepo.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should sign the challenge with type mfa_challenge and a short expiry', async () => {
      await service.login(dto);
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({ sub: MFA_USER.id, type: 'mfa_challenge' }),
        expect.objectContaining({ expiresIn: '5m' }),
      );
    });
  });

  // ── verifyMfaChallenge() ──────────────────────────────────────
  describe('verifyMfaChallenge()', () => {
    const MFA_USER = { ...MOCK_USER, mfaEnabled: true, mfaSecret: 'v1:iv:tag:ciphertext' };
    const verifyDto = { challenge: 'valid.challenge.token', code: '123456' };

    beforeEach(() => {
      jwtService.verifyAsync.mockResolvedValue({ sub: MFA_USER.id, type: 'mfa_challenge' } as never);
      usersRepo.findById.mockResolvedValue(MFA_USER as never);
    });

    it('should issue tokens for a valid TOTP code', async () => {
      const result = await service.verifyMfaChallenge(verifyDto);
      expect(result.accessToken).toBeDefined();
      expect(result.user.email).toBe(MFA_USER.email);
    });

    it('should decrypt the stored secret before verifying', async () => {
      await service.verifyMfaChallenge(verifyDto);
      expect(mfaSecretDecryptor.decryptValue).toHaveBeenCalledWith(MFA_USER.mfaSecret, `USER:${MFA_USER.id}`);
      expect(totpService.verifyToken).toHaveBeenCalledWith(verifyDto.code, 'MOCKSECRETBASE32');
    });

    it('should throw UnauthorizedException for an invalid TOTP code', async () => {
      totpService.verifyToken.mockReturnValue(false);
      await expect(service.verifyMfaChallenge(verifyDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should not issue tokens for an invalid TOTP code', async () => {
      totpService.verifyToken.mockReturnValue(false);
      await expect(service.verifyMfaChallenge(verifyDto)).rejects.toThrow();
      expect(authRepo.updateRefreshToken).not.toHaveBeenCalled();
    });

    it('should record an audit failure entry for an invalid TOTP code', async () => {
      totpService.verifyToken.mockReturnValue(false);
      await expect(service.verifyMfaChallenge(verifyDto)).rejects.toThrow();
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.mfa.login_failure', outcome: 'FAILURE' }),
      );
    });

    it('should record an audit success entry for a valid TOTP code', async () => {
      await service.verifyMfaChallenge(verifyDto);
      expect(auditLogsService.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.mfa.login_success', outcome: 'SUCCESS' }),
      );
    });

    it('should throw UnauthorizedException for an expired/invalid challenge token', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
      await expect(service.verifyMfaChallenge(verifyDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when the challenge has the wrong type', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: MFA_USER.id, type: 'access' } as never);
      await expect(service.verifyMfaChallenge(verifyDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException when the password has expired', async () => {
      usersRepo.findById.mockResolvedValue({ ...MFA_USER, passwordChangedAt: null } as never);
      await expect(service.verifyMfaChallenge(verifyDto)).rejects.toThrow(ForbiddenException);
    });

    it('should never log the decrypted TOTP secret or the submitted code', async () => {
      const loggerSpy = jest.spyOn((service as unknown as { logger: { log: (...a: unknown[]) => void } }).logger, 'log');
      await service.verifyMfaChallenge(verifyDto);
      for (const call of loggerSpy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain('MOCKSECRETBASE32');
        expect(JSON.stringify(call)).not.toContain(verifyDto.code);
      }
    });
  });

  // ── MFA setup / verify-setup / disable ────────────────────────
  describe('MFA setup → verify → disable', () => {
    beforeEach(() => {
      usersRepo.findById.mockResolvedValue(MOCK_USER as never);
    });

    it('setupMfa() generates and stores an encrypted secret', async () => {
      const result = await service.setupMfa(MOCK_USER.id);
      expect(result.secret).toBe('MOCKSECRETBASE32');
      expect(result.otpauthUrl).toContain('otpauth://');
      expect(mfaSecretEncryptor.encryptValue).toHaveBeenCalledWith('MOCKSECRETBASE32', `USER:${MOCK_USER.id}`);
      expect(authRepo.setPendingMfaSecret).toHaveBeenCalledWith(MOCK_USER.id, 'v1:iv:tag:ciphertext');
    });

    it('setupMfa() throws ConflictException if MFA already enabled', async () => {
      usersRepo.findById.mockResolvedValue({ ...MOCK_USER, mfaEnabled: true } as never);
      await expect(service.setupMfa(MOCK_USER.id)).rejects.toThrow(ConflictException);
    });

    it('verifyMfaSetup() enables MFA for a valid code', async () => {
      usersRepo.findById.mockResolvedValue({ ...MOCK_USER, mfaSecret: 'v1:iv:tag:ciphertext' } as never);
      await service.verifyMfaSetup(MOCK_USER.id, '123456');
      expect(authRepo.enableMfa).toHaveBeenCalledWith(MOCK_USER.id);
    });

    it('verifyMfaSetup() records an auth.mfa.enabled audit event', async () => {
      usersRepo.findById.mockResolvedValue({ ...MOCK_USER, mfaSecret: 'v1:iv:tag:ciphertext' } as never);
      await service.verifyMfaSetup(MOCK_USER.id, '123456');
      expect(auditLogsService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.mfa.enabled' }));
    });

    it('verifyMfaSetup() throws for an invalid code', async () => {
      usersRepo.findById.mockResolvedValue({ ...MOCK_USER, mfaSecret: 'v1:iv:tag:ciphertext' } as never);
      totpService.verifyToken.mockReturnValue(false);
      await expect(service.verifyMfaSetup(MOCK_USER.id, '000000')).rejects.toThrow(UnauthorizedException);
      expect(authRepo.enableMfa).not.toHaveBeenCalled();
    });

    it('verifyMfaSetup() throws BadRequestException when no setup is pending', async () => {
      usersRepo.findById.mockResolvedValue({ ...MOCK_USER, mfaSecret: null } as never);
      await expect(service.verifyMfaSetup(MOCK_USER.id, '123456')).rejects.toThrow(BadRequestException);
    });

    it('disableMfa() disables MFA for a valid code', async () => {
      usersRepo.findById.mockResolvedValue({ ...MOCK_USER, mfaEnabled: true, mfaSecret: 'v1:iv:tag:ciphertext' } as never);
      await service.disableMfa(MOCK_USER.id, '123456');
      expect(authRepo.disableMfa).toHaveBeenCalledWith(MOCK_USER.id);
      expect(auditLogsService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.mfa.disabled' }));
    });

    it('disableMfa() throws for an invalid code', async () => {
      usersRepo.findById.mockResolvedValue({ ...MOCK_USER, mfaEnabled: true, mfaSecret: 'v1:iv:tag:ciphertext' } as never);
      totpService.verifyToken.mockReturnValue(false);
      await expect(service.disableMfa(MOCK_USER.id, '000000')).rejects.toThrow(UnauthorizedException);
      expect(authRepo.disableMfa).not.toHaveBeenCalled();
    });

    it('disableMfa() throws BadRequestException when MFA is not enabled', async () => {
      usersRepo.findById.mockResolvedValue({ ...MOCK_USER, mfaEnabled: false, mfaSecret: null } as never);
      await expect(service.disableMfa(MOCK_USER.id, '123456')).rejects.toThrow(BadRequestException);
    });
  });

  // ── changePassword() ──────────────────────────────────────────
  describe('changePassword()', () => {
    const dto = { email: 'john@acmecorp.com', currentPassword: 'Old!Passw0rd123', newPassword: 'N3w!Str0ngPassw0rd' };

    beforeEach(() => {
      usersRepo.findByEmail.mockResolvedValue(MOCK_USER as never);
    });

    it('should hash the new password with the existing salt rounds and update passwordChangedAt', async () => {
      await service.changePassword(dto);
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(dto.newPassword, expect.any(Number));
      expect(authRepo.updatePassword).toHaveBeenCalledWith(MOCK_USER.id, 'hashed_value');
    });

    it('should record an auth.password.changed audit event', async () => {
      await service.changePassword(dto);
      expect(auditLogsService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'auth.password.changed' }));
    });

    it('should throw UnauthorizedException for wrong current password', async () => {
      mockedBcrypt.compare.mockResolvedValue(false as never);
      await expect(service.changePassword(dto)).rejects.toThrow(UnauthorizedException);
      expect(authRepo.updatePassword).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for an unknown email (no user enumeration)', async () => {
      usersRepo.findByEmail.mockResolvedValue(null);
      mockedBcrypt.compare.mockResolvedValue(false as never);
      await expect(service.changePassword(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should succeed even when the current password has expired', async () => {
      usersRepo.findByEmail.mockResolvedValue({ ...MOCK_USER, passwordChangedAt: null } as never);
      await expect(service.changePassword(dto)).resolves.toBeUndefined();
      expect(authRepo.updatePassword).toHaveBeenCalled();
    });
  });

  // ── logout() ─────────────────────────────────────────────────
  describe('logout()', () => {
    it('should nullify the refresh token hash', async () => {
      await service.logout(MOCK_USER.id);
      expect(authRepo.updateRefreshToken).toHaveBeenCalledWith(MOCK_USER.id, null);
    });

    it('should not throw', async () => {
      await expect(service.logout(MOCK_USER.id)).resolves.toBeUndefined();
    });
  });

  // ── refreshTokens() ──────────────────────────────────────────
  describe('refreshTokens()', () => {
    it('should return new tokens', async () => {
      const result = await service.refreshTokens(MOCK_USER as never);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should store new refresh token hash (rotation)', async () => {
      await service.refreshTokens(MOCK_USER as never);
      expect(authRepo.updateRefreshToken).toHaveBeenCalledWith(
        MOCK_USER.id,
        'hashed_value',
      );
    });

    it('should return sanitized user', async () => {
      const result = await service.refreshTokens(MOCK_USER as never);
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('refreshTokenHash');
    });

    it('should throw ForbiddenException when the password has expired', async () => {
      await expect(service.refreshTokens({ ...MOCK_USER, passwordChangedAt: null } as never)).rejects.toThrow(ForbiddenException);
    });
  });
});
