import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WorkspaceId, Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { MarketplaceAccountService } from './marketplace-account.service';
import {
  AccountFilterQueryDto,
  AccountResponseDto,
  CreateAccountRequestDto,
  PaginatedAccountResponseDto,
  SetPriorityRequestDto,
  StatusTransitionRequestDto,
  UpdateAccountRequestDto,
} from './dto';

const WRITE_ROLES = ['ADMIN', 'OPERATOR'];

/**
 * Read endpoints (list/get/history) remain open to any authenticated
 * workspace member. Write operations that connect, mutate, or remove a
 * seller account — i.e. Amazon Information — are role-gated using the same
 * RolesGuard/@Roles tiering already applied to
 * MarketplaceProviderCredentialsController: `ADMIN`-only for
 * create/delete, `ADMIN`/`OPERATOR` for everything else that changes
 * account state.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('marketplace-accounts')
export class MarketplaceAccountController {
  constructor(private readonly service: MarketplaceAccountService) {}

  // ── Create ────────────────────────────────────────────────

  @Post()
  @Roles('ADMIN')
  async create(@Body() dto: CreateAccountRequestDto): Promise<AccountResponseDto> {
    const account = await this.service.createAccount(dto);
    return AccountResponseDto.from(account);
  }

  // ── List ──────────────────────────────────────────────────

  @Get()
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() query: AccountFilterQueryDto,
  ): Promise<PaginatedAccountResponseDto> {
    const result = await this.service.findAll({
      ...query,
      sortOrder: query.sortOrder as unknown as 'asc' | 'desc' | undefined,
      workspaceId,
    });
    return {
      items: result.items.map(AccountResponseDto.from),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  // ── Get by ID ─────────────────────────────────────────────

  @Get(':workspaceId/:id')
  async findById(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<AccountResponseDto> {
    const account = await this.service.findById(id, workspaceId);
    return AccountResponseDto.from(account);
  }

  // ── Update ────────────────────────────────────────────────

  @Patch(':workspaceId/:id')
  @Roles(...WRITE_ROLES)
  async update(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: UpdateAccountRequestDto,
  ): Promise<AccountResponseDto> {
    const account = await this.service.updateAccount(id, workspaceId, dto);
    return AccountResponseDto.from(account);
  }

  // ── Enable ────────────────────────────────────────────────

  @Post(':workspaceId/:id/enable')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async enable(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: StatusTransitionRequestDto,
  ): Promise<AccountResponseDto> {
    const account = await this.service.enableAccount(id, workspaceId, { testedBy: dto.updatedBy });
    return AccountResponseDto.from(account);
  }

  // ── Disable ───────────────────────────────────────────────

  @Post(':workspaceId/:id/disable')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async disable(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: StatusTransitionRequestDto,
  ): Promise<AccountResponseDto> {
    const account = await this.service.disableAccount(id, workspaceId, dto);
    return AccountResponseDto.from(account);
  }

  // ── Archive ───────────────────────────────────────────────

  @Post(':workspaceId/:id/archive')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async archive(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: StatusTransitionRequestDto,
  ): Promise<AccountResponseDto> {
    const account = await this.service.archiveAccount(id, workspaceId, dto);
    return AccountResponseDto.from(account);
  }

  // ── Restore ───────────────────────────────────────────────

  @Post(':workspaceId/:id/restore')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async restore(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: StatusTransitionRequestDto,
  ): Promise<AccountResponseDto> {
    const account = await this.service.restoreAccount(id, workspaceId, {
      updatedBy: dto.updatedBy,
    });
    return AccountResponseDto.from(account);
  }

  // ── Delete ────────────────────────────────────────────────

  @Delete(':workspaceId/:id')
  @Roles('ADMIN')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string, @Param('workspaceId') workspaceId: string): Promise<void> {
    await this.service.deleteAccount(id, workspaceId);
  }

  // ── Test Connection ───────────────────────────────────────

  @Post(':workspaceId/:id/test-connection')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async testConnection(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
  ): Promise<{ success: boolean; correlationId: string; errorMessage?: string | null }> {
    return this.service.testConnection(id, workspaceId);
  }

  // ── Set Default ───────────────────────────────────────────

  @Post(':workspaceId/:id/set-default')
  @Roles(...WRITE_ROLES)
  @HttpCode(HttpStatus.OK)
  async setDefault(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: StatusTransitionRequestDto,
  ): Promise<AccountResponseDto> {
    const account = await this.service.setDefaultAccount(id, workspaceId, {
      updatedBy: dto.updatedBy,
    });
    return AccountResponseDto.from(account);
  }

  // ── Set Priority ──────────────────────────────────────────

  @Patch(':workspaceId/:id/priority')
  @Roles(...WRITE_ROLES)
  async setPriority(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: SetPriorityRequestDto,
  ): Promise<AccountResponseDto> {
    const account = await this.service.setAccountPriority(id, workspaceId, dto.priority, {
      updatedBy: dto.updatedBy,
    });
    return AccountResponseDto.from(account);
  }

  // ── History ───────────────────────────────────────────────

  @Get(':workspaceId/:id/history')
  async getHistory(
    @Param('id') id: string,
    @Param('workspaceId') workspaceId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getHistory(id, workspaceId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
