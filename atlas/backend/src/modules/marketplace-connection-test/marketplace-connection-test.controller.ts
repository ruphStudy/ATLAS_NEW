import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { MarketplaceConnectionTestService } from './marketplace-connection-test.service';
import { ConnectionTestRequest, ConnectionTestTrigger } from './interfaces';

@Controller('marketplace-connection-test')
export class MarketplaceConnectionTestController {
  private readonly logger = new Logger(MarketplaceConnectionTestController.name);

  constructor(private readonly service: MarketplaceConnectionTestService) {}

  @Post('test')
  test(@Body() body: ConnectionTestRequest) {
    return this.service.test(body);
  }

  @Post('test-all')
  testAll(@Body('workspaceId') workspaceId: string) {
    return this.service.testAll(workspaceId);
  }

  @Get('history/:workspaceId')
  getHistory(
    @Param('workspaceId') workspaceId: string,
    @Query('providerKey') providerKey?: string,
    @Query('accountId') accountId?: string,
    @Query('success') success?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getHistory({
      workspaceId,
      providerKey: providerKey ?? null,
      accountId: accountId ?? null,
      success: success !== undefined ? success === 'true' : null,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    });
  }

  @Get(':workspaceId/result/:id')
  getById(@Param('id') id: string, @Param('workspaceId') workspaceId: string) {
    return this.service.getById(id, workspaceId);
  }

  @Get('correlation/:correlationId')
  getByCorrelationId(@Param('correlationId') correlationId: string) {
    return this.service.getByCorrelationId(correlationId);
  }
}
