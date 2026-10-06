import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { User } from '@prisma/client';
import { AuthenticationService } from './authentication.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  AuthResponseDto,
  AuthUserDto,
  ChangePasswordDto,
  MfaSetupResponseDto,
  MfaVerifyCodeDto,
  MfaChallengeResponseDto,
  MfaChallengeVerifyDto,
} from './dto';
import { Public, CurrentUser } from './decorators';
import { JwtRefreshGuard } from './guards';
import type { IJwtPayload } from './interfaces';
import { AUTH_CONSTANTS } from './constants';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  // ── POST /auth/register ──────────────────────────────────────

  @Post('register')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: AUTH_CONSTANTS.REGISTER_THROTTLE_LIMIT, ttl: AUTH_CONSTANTS.REGISTER_THROTTLE_TTL_MS } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account and workspace' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, type: AuthResponseDto, description: 'Account created' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  // ── POST /auth/login ─────────────────────────────────────────

  @Post('login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: AUTH_CONSTANTS.LOGIN_THROTTLE_LIMIT, ttl: AUTH_CONSTANTS.LOGIN_THROTTLE_TTL_MS } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto, description: 'Login successful, or an MFA challenge if the account has MFA enabled' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account suspended, inactive, temporarily locked, or password expired' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto | MfaChallengeResponseDto> {
    return this.authService.login(dto);
  }

  // ── POST /auth/mfa/login ─────────────────────────────────────

  @Post('mfa/login')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: AUTH_CONSTANTS.MFA_CHALLENGE_THROTTLE_LIMIT, ttl: AUTH_CONSTANTS.MFA_CHALLENGE_THROTTLE_TTL_MS } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete login by verifying a TOTP code against a login MFA challenge' })
  @ApiBody({ type: MfaChallengeVerifyDto })
  @ApiResponse({ status: 200, type: AuthResponseDto, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid or expired challenge, or invalid MFA code' })
  @ApiResponse({ status: 403, description: 'Password expired' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  verifyMfaLogin(@Body() dto: MfaChallengeVerifyDto): Promise<AuthResponseDto> {
    return this.authService.verifyMfaChallenge(dto);
  }

  // ── POST /auth/change-password ───────────────────────────────

  @Post('change-password')
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: AUTH_CONSTANTS.CHANGE_PASSWORD_THROTTLE_LIMIT, ttl: AUTH_CONSTANTS.CHANGE_PASSWORD_THROTTLE_TTL_MS } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change password by proving the current password (works even when the current password has expired)' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 204, description: 'Password changed; all existing refresh sessions are invalidated' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async changePassword(@Body() dto: ChangePasswordDto): Promise<void> {
    await this.authService.changePassword(dto);
  }

  // ── MFA enrollment ────────────────────────────────────────────

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Begin MFA enrollment — generates a new TOTP secret (not yet enabled)' })
  @ApiResponse({ status: 200, type: MfaSetupResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 409, description: 'MFA already enabled' })
  setupMfa(@CurrentUser('sub') userId: string): Promise<MfaSetupResponseDto> {
    return this.authService.setupMfa(userId);
  }

  @Post('mfa/verify-setup')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Confirm MFA enrollment with a TOTP code — enables MFA on success' })
  @ApiBody({ type: MfaVerifyCodeDto })
  @ApiResponse({ status: 204, description: 'MFA enabled' })
  @ApiResponse({ status: 401, description: 'Unauthenticated, or invalid MFA code' })
  @ApiResponse({ status: 400, description: 'No pending MFA setup' })
  @ApiResponse({ status: 409, description: 'MFA already enabled' })
  async verifyMfaSetup(@CurrentUser('sub') userId: string, @Body() dto: MfaVerifyCodeDto): Promise<void> {
    await this.authService.verifyMfaSetup(userId, dto.code);
  }

  @Post('mfa/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Disable MFA — requires a valid current TOTP code' })
  @ApiBody({ type: MfaVerifyCodeDto })
  @ApiResponse({ status: 204, description: 'MFA disabled' })
  @ApiResponse({ status: 401, description: 'Unauthenticated, or invalid MFA code' })
  @ApiResponse({ status: 400, description: 'MFA not enabled' })
  async disableMfa(@CurrentUser('sub') userId: string, @Body() dto: MfaVerifyCodeDto): Promise<void> {
    await this.authService.disableMfa(userId, dto.code);
  }

  // ── POST /auth/logout ────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  async logout(@CurrentUser('sub') userId: string): Promise<void> {
    await this.authService.logout(userId);
  }

  // ── POST /auth/refresh ───────────────────────────────────────

  @Post('refresh')
  @Public()
  @UseGuards(JwtRefreshGuard, ThrottlerGuard)
  @Throttle({ default: { limit: AUTH_CONSTANTS.LOGIN_THROTTLE_LIMIT, ttl: AUTH_CONSTANTS.LOGIN_THROTTLE_TTL_MS } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate tokens using a valid refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, type: AuthResponseDto, description: 'Tokens rotated' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  refresh(@CurrentUser() user: User): Promise<AuthResponseDto> {
    return this.authService.refreshTokens(user);
  }

  // ── GET /auth/me ─────────────────────────────────────────────

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: AuthUserDto, description: 'Current user' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  me(@CurrentUser() payload: IJwtPayload): IJwtPayload {
    return payload;
  }
}
