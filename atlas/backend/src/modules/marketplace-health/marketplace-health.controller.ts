import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { MarketplaceHealthService } from './marketplace-health.service';
import { HealthCheckTrigger } from './interfaces';

@Controller('marketplace-health')
export class MarketplaceHealthController {
  private readonly logger = new Logger(MarketplaceHealthController.name);

  constructor(private readonly service: MarketplaceHealthService) {}

  // ── Manual Check ──────────────────────────────────────────

  @Post('check')
  checkProvider(
    @Body() body: { workspaceId: string; providerKey: string; accountId?: string; timeout?: number },
  ) {
    return this.service.checkProvider({
      workspaceId: body.workspaceId,
      providerKey: body.providerKey,
      accountId: body.accountId,
      trigger: HealthCheckTrigger.MANUAL,
      timeout: body.timeout,
    });
  }

  @Post('check-all')
  checkAll(@Body('workspaceId') workspaceId: string) {
    return this.service.checkAllForWorkspace(workspaceId);
  }

  // ── Current Status ────────────────────────────────────────

  @Get('status/:workspaceId/:providerKey')
  getStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('providerKey') providerKey: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.getStatus(workspaceId, providerKey, accountId);
  }

  @Get('status/:workspaceId')
  getAllStatuses(@Param('workspaceId') workspaceId: string) {
    return this.service.getAllStatuses(workspaceId);
  }

  // ── Dashboard ─────────────────────────────────────────────

  @Get('dashboard/:workspaceId')
  getDashboard(@Param('workspaceId') workspaceId: string) {
    return this.service.getDashboard(workspaceId);
  }

  // ── History ───────────────────────────────────────────────

  @Get('history/:workspaceId')
  getHistory(
    @Param('workspaceId') workspaceId: string,
    @Query('providerKey') providerKey?: string,
    @Query('accountId') accountId?: string,
    @Query('state') state?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getHistory({
      workspaceId,
      providerKey: providerKey ?? null,
      accountId: accountId ?? null,
      state: state as any ?? null,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  // ── Metrics ───────────────────────────────────────────────

  @Get('metrics/:workspaceId/:providerKey')
  getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Param('providerKey') providerKey: string,
    @Query('accountId') accountId?: string,
  ) {
    return this.service.getMetrics(workspaceId, providerKey, accountId);
  }

  @Get('metrics/:workspaceId')
  getAllMetrics(@Param('workspaceId') workspaceId: string) {
    return this.service.getAllMetrics(workspaceId);
  }

  // ── Scheduler ─────────────────────────────────────────────

  @Post('scheduler/add')
  addToScheduler(@Body() body: { workspaceId: string; intervalMs?: number }) {
    this.service.addWorkspaceToScheduler(body.workspaceId, body.intervalMs);
    return { ok: true };
  }

  @Post('scheduler/remove')
  removeFromScheduler(@Body('workspaceId') workspaceId: string) {
    this.service.removeWorkspaceFromScheduler(workspaceId);
    return { ok: true };
  }

  @Post('scheduler/trigger')
  triggerAll() {
    return this.service.triggerScheduledChecks();
  }
}
