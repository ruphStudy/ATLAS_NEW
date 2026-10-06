import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthenticationService } from '../authentication.service';
import { AuthenticationRepository } from '../authentication.repository';
import { UsersRepository } from '@modules/users/users.repository';
import { ConfigurationService } from '@config/configuration.service';

// ── Mock bcrypt ───────────────────────────────────────────────
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));
import * as bcrypt from 'bcryptjs';
const mockedBcrypt = jest.mocked(bcrypt);

// ── Mock uuid ────────────────────────────────────────────────
jest.mock('uuid', () => ({ v4: () => 'aaaabbbb-cccc-dddd-eeee-ffffgggghhhh' }));

// ── Mock data ─────────────────────────────────────────────────
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
  avatarUrl: null,
  phone: null,
  timezone: 'UTC',
  locale: 'en-US',
  lastLoginAt: null,
  emailVerifiedAt: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
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
          },
        },
        {
          provide: ConfigurationService,
          useValue: { getJwtConfig: () => MOCK_JWT_CONFIG },
        },
      ],
    }).compile();

    service = module.get(AuthenticationService);
    authRepo = module.get(AuthenticationRepository);
    usersRepo = module.get(UsersRepository);
    jwtService = module.get(JwtService);
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

  // ── login() ──────────────────────────────────────────────────
  describe('login()', () => {
    const dto = { email: 'john@acmecorp.com', password: 'Str0ng!Pass' };

    beforeEach(() => {
      usersRepo.findByEmail.mockResolvedValue(MOCK_USER as never);
    });

    it('should return tokens and sanitized user on success', async () => {
      const result = await service.login(dto);
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
  });
});
