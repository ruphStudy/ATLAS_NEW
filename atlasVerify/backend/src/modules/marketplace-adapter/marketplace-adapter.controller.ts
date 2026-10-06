import { Controller, Get, Post, Delete, Query, Body, Param } from '@nestjs/common';
import { MarketplaceAdapterService } from './marketplace-adapter.service';
import {
  InitializeAdapterRequestDto,
  ExecuteOperationRequestDto,
  GetCapabilitiesQueryDto,
  HealthCheckQueryDto,
  ConnectionTestQueryDto,
  ListAdaptersQueryDto,
  AdapterResponseDto,
  AdapterCapabilitiesResponseDto,
  AdapterHealthCheckResponseDto,
  AdapterConnectionTestResponseDto,
  RegisteredAdapterDto,
  ActiveAdapterDto,
} from './dto';

@Controller('marketplace/adapter')
export class MarketplaceAdapterController {
  constructor(
    private readonly adapterService: MarketplaceAdapterService,
  ) {}

  @Post('initialize')
  async initializeAdapter(
    @Body() dto: InitializeAdapterRequestDto,
  ): Promise<{ success: boolean }> {
    await this.adapterService.initializeAdapter(dto.config, dto.credentials);
    return { success: true };
  }

  @Delete(':provider/:accountId')
  async destroyAdapter(
    @Param('provider') provider: string,
    @Param('accountId') accountId: string,
  ): Promise<{ success: boolean }> {
    await this.adapterService.destroyAdapter(provider, accountId);
    return { success: true };
  }

  @Post('execute')
  async executeOperation(
    @Body() dto: ExecuteOperationRequestDto,
  ): Promise<AdapterResponseDto> {
    const context = {
      workspaceId: dto.workspaceId,
      provider: dto.provider,
      accountId: dto.accountId,
      operation: dto.operation,
      requestId: this.generateRequestId(),
    };

    return this.adapterService.executeOperation(
      context,
      { ...dto.parameters, ...dto.pagination },
      dto.data,
    );
  }

  @Get('capabilities')
  async getCapabilities(
    @Query() query: GetCapabilitiesQueryDto,
  ): Promise<AdapterCapabilitiesResponseDto> {
    return this.adapterService.getCapabilities(
      query.provider,
      query.accountId,
    );
  }

  @Get('health')
  async healthCheck(
    @Query() query: HealthCheckQueryDto,
  ): Promise<AdapterHealthCheckResponseDto> {
    return this.adapterService.healthCheck(query.provider, query.accountId);
  }

  @Post('connection-test')
  async testConnection(
    @Body() dto: ConnectionTestQueryDto,
  ): Promise<AdapterConnectionTestResponseDto> {
    return this.adapterService.testConnection(dto.provider, dto.accountId);
  }

  @Get('registered')
  async listRegisteredAdapters(): Promise<RegisteredAdapterDto[]> {
    const providers = this.adapterService.listRegisteredAdapters();
    return providers.map((provider) => ({
      provider,
      registered: true,
    }));
  }

  @Get('active/:provider/:accountId')
  async hasAdapter(
    @Param('provider') provider: string,
    @Param('accountId') accountId: string,
  ): Promise<{ active: boolean }> {
    const active = this.adapterService.hasAdapter(provider, accountId);
    return { active };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
