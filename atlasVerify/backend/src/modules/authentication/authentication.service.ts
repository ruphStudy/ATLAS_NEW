import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { ConfigurationService } from '@config/configuration.service';
import { slugify } from '@common/utils';
import { UsersRepository } from '@modules/users/users.repository';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { AUTH_CONSTANTS } from './constants';
import { AuthenticationRepository } from './authentication.repository';
import { FailedLoginTracker } from './failed-login.tracker';
import type { RegisterDto, LoginDto, AuthResponseDto, AuthUserDto } from './dto';
import type { IAuthTokens, IJwtPayload } from './interfaces';

const AUTH_MODULE = 'authentication';

@Injectable()
export class AuthenticationService {
  private readonly logger = new Logger(AuthenticationService.name);

  constructor(
    private readonly authRepository: AuthenticationRepository,
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigurationService,
    private readonly failedLoginTracker: FailedLoginTracker,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Register ─────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);

    // Unique slug: base-slug + first 8 chars of UUID
    const baseSlug = slugify(dto.workspaceName);
    const workspaceSlug = `${baseSlug}-${uuidv4().split('-')[0]}`;

    const user = await this.authRepository.createUserWithWorkspace({
      workspaceName: dto.workspaceName,
      workspaceSlug,
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
    });

    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    this.logger.log(`User registered: ${user.email} (${user.id})`);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ── Login ────────────────────────────────────────────────────

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    if (this.failedLoginTracker.isLocked(dto.email)) {
      throw new ForbiddenException(
        'Too many failed login attempts. Please try again later.',
      );
    }

    const user = await this.usersRepository.findByEmail(dto.email);

    // Use constant-time comparison to prevent user enumeration timing attacks
    const passwordHash = user?.passwordHash ?? '$2b$12$invalidhashfortiminguniformity';
    const passwordValid = await bcrypt.compare(dto.password, passwordHash);

    if (!user || !passwordValid) {
      this.failedLoginTracker.recordFailure(dto.email);
      if (user) {
        await this.recordLoginAudit(user, ActivityOutcome.FAILURE, 'Invalid password');
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'SUSPENDED') {
      await this.recordLoginAudit(user, ActivityOutcome.FAILURE, 'Account suspended');
      throw new ForbiddenException('Your account has been suspended');
    }

    if (user.status === 'INACTIVE') {
      await this.recordLoginAudit(user, ActivityOutcome.FAILURE, 'Account inactive');
      throw new ForbiddenException('Your account is inactive');
    }

    this.failedLoginTracker.reset(dto.email);

    const tokens = await this.generateTokens(user);

    await Promise.all([
      this.storeRefreshToken(user.id, tokens.refreshToken),
      this.authRepository.updateLastLogin(user.id),
    ]);

    await this.recordLoginAudit(user, ActivityOutcome.SUCCESS);

    this.logger.log(`User logged in: ${user.email}`);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ── Logout ───────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    await this.authRepository.updateRefreshToken(userId, null);
    this.logger.log(`User logged out: ${userId}`);
  }

  // ── Refresh Token Rotation ────────────────────────────────────

  async refreshTokens(user: User): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  /**
   * Re-issues tokens scoped to a different workspace than the user's home
   * `user.workspaceId` — the "workspace switching" primitive Workspace
   * Management builds on. The caller (`WorkspaceMembershipService`) is
   * responsible for verifying the user actually has access to
   * `workspaceId` before calling this; Authentication only mints the token.
   * The `role` claim intentionally stays the user's legacy global role —
   * per-workspace membership roles are enforced separately by Workspace
   * Management, not by this claim.
   */
  async issueTokensForWorkspace(user: User, workspaceId: string): Promise<AuthResponseDto> {
    const tokens = await this.generateTokens(user, workspaceId);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ── Private Helpers ───────────────────────────────────────────

  private async generateTokens(user: User, workspaceIdOverride?: string): Promise<IAuthTokens> {
    const { secret, expiresIn, refreshSecret, refreshExpiresIn } =
      this.configService.getJwtConfig();

    const basePayload = {
      sub: user.id,
      email: user.email,
      workspaceId: workspaceIdOverride ?? user.workspaceId,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { ...basePayload, type: AUTH_CONSTANTS.ACCESS_TOKEN_TYPE } satisfies IJwtPayload,
        { secret, expiresIn },
      ),
      this.jwtService.signAsync(
        { ...basePayload, type: AUTH_CONSTANTS.REFRESH_TOKEN_TYPE } satisfies IJwtPayload,
        { secret: refreshSecret, expiresIn: refreshExpiresIn },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const hash = await bcrypt.hash(refreshToken, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
    await this.authRepository.updateRefreshToken(userId, hash);
  }

  /**
   * Writes a lightweight entry to the central, cross-cutting audit ledger.
   * Only called once a user record is resolved (the ledger is
   * workspace-scoped) — unknown-email attempts are still rate-limited via
   * `FailedLoginTracker` but aren't attributable to a workspace.
   */
  private async recordLoginAudit(
    user: User,
    outcome: ActivityOutcome,
    reason?: string,
  ): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId: user.workspaceId,
        actorType: ActivityActorType.USER,
        actorId: user.id,
        actorName: `${user.firstName} ${user.lastName}`.trim(),
        actorRole: user.role,
        action: 'auth.login',
        actionCategory: AuditActionCategory.LOGIN,
        module: AUTH_MODULE,
        entityType: 'User',
        entityId: user.id,
        outcome,
        reason,
      });
    } catch (err) {
      this.logger.warn(`Failed to record login audit entry: ${(err as Error).message}`);
    }
  }

  /**
   * Returns a safe user object — never exposes passwordHash or refreshTokenHash.
   */
  private sanitizeUser(user: User): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      workspaceId: user.workspaceId,
      status: user.status,
    };
  }
}
