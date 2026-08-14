import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { Roles } from '@common/decorators';
import { MarketplaceProviderCredentialsService } from './marketplace-provider-credentials.service';
import {
  CreateCredentialDto,
  CredentialFilterDto,
  RotateCredentialDto,
  UpdateCredentialDto,
} from './dto';

const WRITE_ROLES = ['ADMIN', 'OPERATOR'];
const READ_ROLES = ['ADMIN', 'OPERATOR', 'VIEWER'];

/**
 * Guards this credential lifecycle surface (SP-API client secret / refresh
 * token authorize, rotate, revoke) with the strictest tier of the 3 —
 * `ADMIN`-only for anything that creates, mutates, or destroys a credential;
 * `ADMIN`/`OPERATOR` only for enable/disable/validate; reads open to
 * `VIEWER` as well (the service layer never returns decrypted secret
 * values here).
 */
@ApiTags('Marketplace Provider Credentials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace-provider-credentials')
export class MarketplaceProviderCredentialsController {
  constructor(
    private readonly service: MarketplaceProviderCredentialsService,
  ) {}

  // ── CRUD ──────────────────────────────────────────────────

  @Post()
  @Roles('ADMIN')
  create(
    @Query('workspaceId') workspaceId: string,
    @Body() dto: CreateCredentialDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.create(workspaceId, dto, userId);
  }

  @Get()
  @Roles(...READ_ROLES)
  findAll(
    @Query('workspaceId') workspaceId: string,
    @Query() filter: CredentialFilterDto,
  ) {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  @Roles(...READ_ROLES)
  findById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findById(id, workspaceId);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateCredentialDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.update(id, workspaceId, dto, userId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.delete(id, workspaceId, userId);
  }

  // ── Status ────────────────────────────────────────────────

  @Post(':id/enable')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  enable(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.enable(id, workspaceId, userId);
  }

  @Post(':id/disable')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  disable(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.disable(id, workspaceId, userId);
  }

  @Post(':id/revoke')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  revoke(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('userId') userId?: string,
  ) {
    return this.service.revoke(id, workspaceId, userId);
  }

  // ── Rotation ──────────────────────────────────────────────

  @Post(':id/rotate')
  @Roles('ADMIN')
  rotate(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: RotateCredentialDto,
    @Query('userId') userId?: string,
  ) {
    return this.service.rotate(id, workspaceId, dto, userId);
  }

  // ── Validation ────────────────────────────────────────────

  @Post(':id/validate')
  @Roles(...WRITE_ROLES)
  validate(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.validateById(id, workspaceId);
  }

  // ── History ───────────────────────────────────────────────

  @Get(':id/history')
  @Roles(...READ_ROLES)
  getHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getHistory(id, workspaceId);
  }

  // ── Cache ─────────────────────────────────────────────────

  @Post('cache/invalidate')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  invalidateCache(
    @Query('providerKey') providerKey?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
