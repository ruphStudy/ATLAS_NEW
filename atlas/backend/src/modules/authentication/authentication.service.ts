import {
  BadRequestException,
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
import { TotpService } from './mfa/totp.service';
import { MfaSecretEncryptor } from './mfa/mfa-secret.encryptor';
import { MfaSecretDecryptor } from './mfa/mfa-secret.decryptor';
import type {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  AuthUserDto,
  ChangePasswordDto,
  MfaSetupResponseDto,
  MfaChallengeResponseDto,
  MfaChallengeVerifyDto,
} from './dto';
import type { IAuthTokens, IJwtPayload, IMfaChallengePayload } from './interfaces';

const AUTH_MODULE = 'authentication';

/** Scope key for deriving each user's MFA-secret encryption key — mirrors the `WORKSPACE:${id}`-style scope keys used by every other per-module credential encryptor. */
const mfaScopeKey = (userId: string): string => `USER:${userId}`;

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
    private readonly totpService: TotpService,
    private readonly mfaSecretEncryptor: MfaSecretEncryptor,
    private readonly mfaSecretDecryptor: MfaSecretDecryptor,
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

  /**
   * Returns full tokens for an MFA-off user (unchanged behavior), or an
   * `MfaChallengeResponseDto` (no tokens) when the account has MFA enabled —
   * the caller must then complete `POST /auth/mfa/login` with the challenge
   * and a fresh TOTP code.
   */
  async login(dto: LoginDto): Promise<AuthResponseDto | MfaChallengeResponseDto> {
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

    if (this.isPasswordExpired(user)) {
      await this.recordLoginAudit(user, ActivityOutcome.FAILURE, 'Password expired');
      throw new ForbiddenException(
        'Your password has expired and must be changed. Use POST /auth/change-password with your current password.',
      );
    }

    if (user.mfaEnabled) {
      // No tokens issued yet — session only begins once `verifyMfaChallenge()` succeeds.
      const challenge = await this.issueMfaChallenge(user.id);
      return { mfaRequired: true, challenge };
    }

    const tokens = await this.generateTokens(user);

    await Promise.all([
      this.storeRefreshToken(user.id, tokens.refreshToken),
      this.authRepository.updateLastLogin(user.id),
    ]);

    await this.recordLoginAudit(user, ActivityOutcome.SUCCESS);

    this.logger.log(`User logged in: ${user.email}`);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ── MFA login challenge ───────────────────────────────────────

  /** Verifies the TOTP code against a login challenge and, only then, issues normal tokens. */
  async verifyMfaChallenge(dto: MfaChallengeVerifyDto): Promise<AuthResponseDto> {
    const payload = await this.verifyChallengeToken(dto.challenge);

    const user = await this.usersRepository.findById(payload.sub);
    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new UnauthorizedException('MFA challenge is no longer valid');
    }

    if (this.isPasswordExpired(user)) {
      throw new ForbiddenException(
        'Your password has expired and must be changed. Use POST /auth/change-password with your current password.',
      );
    }

    const secret = this.mfaSecretDecryptor.decryptValue(user.mfaSecret, mfaScopeKey(user.id));
    const isValid = this.totpService.verifyToken(dto.code, secret);

    if (!isValid) {
      await this.recordAudit(user, 'auth.mfa.login_failure', AuditActionCategory.LOGIN, ActivityOutcome.FAILURE, 'Invalid MFA code');
      throw new UnauthorizedException('Invalid MFA code');
    }

    const tokens = await this.generateTokens(user);

    await Promise.all([
      this.storeRefreshToken(user.id, tokens.refreshToken),
      this.authRepository.updateLastLogin(user.id),
    ]);

    await this.recordAudit(user, 'auth.mfa.login_success', AuditActionCategory.LOGIN, ActivityOutcome.SUCCESS);
    await this.recordLoginAudit(user, ActivityOutcome.SUCCESS);

    this.logger.log(`User completed MFA login: ${user.email}`);

    return { ...tokens, user: this.sanitizeUser(user) };
  }

  // ── MFA enrollment ────────────────────────────────────────────

  async setupMfa(userId: string): Promise<MfaSetupResponseDto> {
    const user = await this.getUserOrThrow(userId);
    if (user.mfaEnabled) {
      throw new ConflictException('MFA is already enabled for this account');
    }

    const secret = this.totpService.generateSecret();
    const encrypted = this.mfaSecretEncryptor.encryptValue(secret, mfaScopeKey(user.id));
    await this.authRepository.setPendingMfaSecret(user.id, encrypted);

    return {
      secret,
      otpauthUrl: this.totpService.generateOtpAuthUrl(user.email, secret),
    };
  }

  async verifyMfaSetup(userId: string, code: string): Promise<void> {
    const user = await this.getUserOrThrow(userId);
    if (user.mfaEnabled) {
      throw new ConflictException('MFA is already enabled for this account');
    }
    if (!user.mfaSecret) {
      throw new BadRequestException('Call POST /auth/mfa/setup first');
    }

    const secret = this.mfaSecretDecryptor.decryptValue(user.mfaSecret, mfaScopeKey(user.id));
    if (!this.totpService.verifyToken(code, secret)) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.authRepository.enableMfa(user.id);
    await this.recordAudit(user, 'auth.mfa.enabled', AuditActionCategory.CONFIGURATION, ActivityOutcome.SUCCESS);
    this.logger.log(`MFA enabled for user: ${user.email}`);
  }

  async disableMfa(userId: string, code: string): Promise<void> {
    const user = await this.getUserOrThrow(userId);
    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled for this account');
    }

    const secret = this.mfaSecretDecryptor.decryptValue(user.mfaSecret, mfaScopeKey(user.id));
    if (!this.totpService.verifyToken(code, secret)) {
      throw new UnauthorizedException('Invalid MFA code');
    }

    await this.authRepository.disableMfa(user.id);
    await this.recordAudit(user, 'auth.mfa.disabled', AuditActionCategory.CONFIGURATION, ActivityOutcome.SUCCESS);
    this.logger.log(`MFA disabled for user: ${user.email}`);
  }

  // ── Change password ───────────────────────────────────────────

  /**
   * Verified by the current password itself, not a bearer token — see
   * `ChangePasswordDto`'s own doc comment for why. Clears the stored
   * refresh-token hash, so every existing refresh session is invalidated;
   * the caller must log in again afterward.
   */
  async changePassword(dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersRepository.findByEmail(dto.email);
    const passwordHash = user?.passwordHash ?? '$2b$12$invalidhashfortiminguniformity';
    const currentValid = await bcrypt.compare(dto.currentPassword, passwordHash);

    if (!user || !currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const newHash = await bcrypt.hash(dto.newPassword, AUTH_CONSTANTS.BCRYPT_SALT_ROUNDS);
    await this.authRepository.updatePassword(user.id, newHash);
    await this.recordAudit(user, 'auth.password.changed', AuditActionCategory.CONFIGURATION, ActivityOutcome.SUCCESS);
    this.logger.log(`Password changed for user: ${user.email}`);
  }

  // ── Logout ───────────────────────────────────────────────────

  async logout(userId: string): Promise<void> {
    await this.authRepository.updateRefreshToken(userId, null);
    this.logger.log(`User logged out: ${userId}`);
  }

  // ── Refresh Token Rotation ────────────────────────────────────

  async refreshTokens(user: User): Promise<AuthResponseDto> {
    if (this.isPasswordExpired(user)) {
      throw new ForbiddenException(
        'Your password has expired and must be changed. Use POST /auth/change-password with your current password.',
      );
    }

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

  private async recordLoginAudit(
    user: User,
    outcome: ActivityOutcome,
    reason?: string,
  ): Promise<void> {
    await this.recordAudit(user, 'auth.login', AuditActionCategory.LOGIN, outcome, reason);
  }

  /**
   * Writes a lightweight entry to the central, cross-cutting audit ledger.
   * Only called once a user record is resolved (the ledger is
   * workspace-scoped) — unknown-email attempts are still rate-limited via
   * `FailedLoginTracker` but aren't attributable to a workspace. Never
   * passed a TOTP secret/code, a password, or recovery material — only the
   * fixed action string and an optional short, non-sensitive reason.
   */
  private async recordAudit(
    user: User,
    action: string,
    actionCategory: AuditActionCategory,
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
        action,
        actionCategory,
        module: AUTH_MODULE,
        entityType: 'User',
        entityId: user.id,
        outcome,
        reason,
      });
    } catch (err) {
      this.logger.warn(`Failed to record ${action} audit entry: ${(err as Error).message}`);
    }
  }

  /** Null `passwordChangedAt` is treated as already-expired (forces rotation) rather than silently trusted — see the field's own schema doc comment. */
  private isPasswordExpired(user: User): boolean {
    if (!user.passwordChangedAt) {
      return true;
    }
    const ageMs = Date.now() - user.passwordChangedAt.getTime();
    return ageMs > AUTH_CONSTANTS.MAX_PASSWORD_AGE_DAYS * 24 * 60 * 60 * 1000;
  }

  private async issueMfaChallenge(userId: string): Promise<string> {
    const { secret } = this.configService.getJwtConfig();
    return this.jwtService.signAsync(
      { sub: userId, type: AUTH_CONSTANTS.MFA_CHALLENGE_TYPE } satisfies IMfaChallengePayload,
      { secret, expiresIn: AUTH_CONSTANTS.MFA_CHALLENGE_EXPIRES_IN },
    );
  }

  private async verifyChallengeToken(challenge: string): Promise<IMfaChallengePayload> {
    const { secret } = this.configService.getJwtConfig();
    let payload: IMfaChallengePayload;
    try {
      payload = await this.jwtService.verifyAsync<IMfaChallengePayload>(challenge, { secret });
    } catch {
      throw new UnauthorizedException('MFA challenge is invalid or has expired');
    }
    if (payload.type !== AUTH_CONSTANTS.MFA_CHALLENGE_TYPE) {
      throw new UnauthorizedException('MFA challenge is invalid or has expired');
    }
    return payload;
  }

  private async getUserOrThrow(userId: string): Promise<User> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
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
      isPlatformAdmin: user.isPlatformAdmin,
    };
  }
}
