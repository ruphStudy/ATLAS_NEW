import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, Logger } from '@nestjs/common';
import { AuthenticationController } from '../authentication.controller';
import { AuthenticationService } from '../authentication.service';
import type { AuthResponseDto } from '../dto';

// ── Mock data ─────────────────────────────────────────────────
const MOCK_AUTH_RESPONSE: AuthResponseDto = {
  accessToken: 'mock.access.token',
  refreshToken: 'mock.refresh.token',
  user: {
    id: 'user-uuid',
    email: 'john@acmecorp.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'OWNER',
    workspaceId: 'ws-uuid',
    status: 'ACTIVE',
    isPlatformAdmin: false,
  },
};

const MOCK_USER = {
  id: 'user-uuid',
  email: 'john@acmecorp.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'OWNER',
  workspaceId: 'ws-uuid',
  status: 'ACTIVE',
  passwordHash: '$2b$12$hashed',
  refreshTokenHash: '$2b$12$hashedrefresh',
};

const MOCK_JWT_PAYLOAD = {
  sub: 'user-uuid',
  email: 'john@acmecorp.com',
  workspaceId: 'ws-uuid',
  role: 'OWNER',
  type: 'access' as const,
};

// ── Test Suite ────────────────────────────────────────────────
describe('AuthenticationController', () => {
  let controller: AuthenticationController;
  let authService: jest.Mocked<AuthenticationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthenticationController],
      providers: [
        {
          provide: AuthenticationService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            refreshTokens: jest.fn(),
          },
        },
      ],
    })
      .setLogger(new Logger())
      .compile();

    controller = module.get(AuthenticationController);
    authService = module.get(AuthenticationService);
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

    it('should return auth response on success', async () => {
      authService.register.mockResolvedValue(MOCK_AUTH_RESPONSE);
      const result = await controller.register(dto);
      expect(result).toEqual(MOCK_AUTH_RESPONSE);
    });

    it('should call authService.register with the DTO', async () => {
      authService.register.mockResolvedValue(MOCK_AUTH_RESPONSE);
      await controller.register(dto);
      expect(authService.register).toHaveBeenCalledWith(dto);
    });

    it('should propagate ConflictException from service', async () => {
      const { ConflictException } = await import('@nestjs/common');
      authService.register.mockRejectedValue(
        new ConflictException('Email already registered'),
      );
      await expect(controller.register(dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── login() ──────────────────────────────────────────────────
  describe('login()', () => {
    const dto = { email: 'john@acmecorp.com', password: 'Str0ng!Pass' };

    it('should return auth response on success', async () => {
      authService.login.mockResolvedValue(MOCK_AUTH_RESPONSE);
      const result = await controller.login(dto);
      expect(result).toEqual(MOCK_AUTH_RESPONSE);
    });

    it('should call authService.login with the DTO', async () => {
      authService.login.mockResolvedValue(MOCK_AUTH_RESPONSE);
      await controller.login(dto);
      expect(authService.login).toHaveBeenCalledWith(dto);
    });

    it('should propagate UnauthorizedException from service', async () => {
      const { UnauthorizedException } = await import('@nestjs/common');
      authService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));
      await expect(controller.login(dto)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout() ─────────────────────────────────────────────────
  describe('logout()', () => {
    it('should call authService.logout with userId from JWT payload', async () => {
      authService.logout.mockResolvedValue(undefined);
      await controller.logout('user-uuid');
      expect(authService.logout).toHaveBeenCalledWith('user-uuid');
    });

    it('should resolve to undefined (204 No Content)', async () => {
      authService.logout.mockResolvedValue(undefined);
      const result = await controller.logout('user-uuid');
      expect(result).toBeUndefined();
    });
  });

  // ── refresh() ────────────────────────────────────────────────
  describe('refresh()', () => {
    it('should return rotated tokens', async () => {
      authService.refreshTokens.mockResolvedValue(MOCK_AUTH_RESPONSE);
      const result = await controller.refresh(MOCK_USER as never);
      expect(result).toEqual(MOCK_AUTH_RESPONSE);
    });

    it('should call refreshTokens with the full user object', async () => {
      authService.refreshTokens.mockResolvedValue(MOCK_AUTH_RESPONSE);
      await controller.refresh(MOCK_USER as never);
      expect(authService.refreshTokens).toHaveBeenCalledWith(MOCK_USER);
    });
  });

  // ── me() ─────────────────────────────────────────────────────
  describe('me()', () => {
    it('should return the JWT payload directly', () => {
      const result = controller.me(MOCK_JWT_PAYLOAD);
      expect(result).toEqual(MOCK_JWT_PAYLOAD);
    });

    it('should include sub (userId) in the response', () => {
      const result = controller.me(MOCK_JWT_PAYLOAD);
      expect(result.sub).toBe('user-uuid');
    });
  });
});
