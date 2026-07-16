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
import { User } from '@prisma/client';
import { AuthenticationService } from './authentication.service';
import { RegisterDto, LoginDto, RefreshTokenDto, AuthResponseDto, AuthUserDto } from './dto';
import { Public, CurrentUser } from './decorators';
import { JwtRefreshGuard } from './guards';
import type { IJwtPayload } from './interfaces';

@ApiTags('Authentication')
@Controller({ path: 'auth', version: '1' })
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  // ── POST /auth/register ──────────────────────────────────────

  @Post('register')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new account and workspace' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, type: AuthResponseDto, description: 'Account created' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @ApiResponse({ status: 422, description: 'Validation failed' })
  register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  // ── POST /auth/login ─────────────────────────────────────────

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, type: AuthResponseDto, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 403, description: 'Account suspended or inactive' })
  login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
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
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate tokens using a valid refresh token' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({ status: 200, type: AuthResponseDto, description: 'Tokens rotated' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
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
