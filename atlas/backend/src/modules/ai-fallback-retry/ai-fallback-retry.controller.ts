import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiFallbackRetryService } from './ai-fallback-retry.service';
import {
  ExecuteWithRetryDto,
  CreateRetryPolicyDto,
  UpdateRetryPolicyDto,
  CreateFallbackConfigDto,
  UpdateFallbackConfigDto,
  RetryExecutionFilterDto,
  RetryPolicyResponseDto,
  RetryExecutionResponseDto,
  PaginatedRetryExecutionResponseDto,
  RetryResultDto,
  FallbackConfigResponseDto,
} from './dto';

@Controller('ai-fallback-retry')
export class AiFallbackRetryController {
  constructor(private readonly retryService: AiFallbackRetryService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async executeWithRetry(
    @Body() dto: ExecuteWithRetryDto,
  ): Promise<RetryResultDto> {
    return (await this.retryService.executeWithRetry(dto)) as RetryResultDto;
  }

  @Get('executions')
  async findAllRetryExecutions(
    @Query() filter: RetryExecutionFilterDto,
  ): Promise<PaginatedRetryExecutionResponseDto> {
    return this.retryService.findAllRetryExecutions(filter);
  }

  @Get('executions/:id')
  async findRetryExecutionById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<RetryExecutionResponseDto> {
    return (await this.retryService.findRetryExecutionById(
      id,
      workspaceId,
    )) as RetryExecutionResponseDto;
  }

  @Get('executions/:id/attempts')
  async getAttempts(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.retryService.getAttempts(id, workspaceId);
  }

  @Get('executions/:id/fallbacks')
  async getFallbacks(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.retryService.getFallbacks(id, workspaceId);
  }

  @Get('stats')
  async getRetryStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.retryService.getRetryStats(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('policies')
  @HttpCode(HttpStatus.CREATED)
  async createRetryPolicy(
    @Body() dto: CreateRetryPolicyDto,
  ): Promise<RetryPolicyResponseDto> {
    return (await this.retryService.createRetryPolicy(
      dto,
    )) as RetryPolicyResponseDto;
  }

  @Patch('policies/:id')
  async updateRetryPolicy(
    @Param('id') id: string,
    @Body() dto: UpdateRetryPolicyDto,
  ): Promise<RetryPolicyResponseDto> {
    return (await this.retryService.updateRetryPolicy(
      id,
      dto,
    )) as RetryPolicyResponseDto;
  }

  @Delete('policies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRetryPolicy(@Param('id') id: string): Promise<void> {
    await this.retryService.deleteRetryPolicy(id);
  }

  @Get('policies/:id')
  async findRetryPolicyById(
    @Param('id') id: string,
  ): Promise<RetryPolicyResponseDto> {
    return (await this.retryService.findRetryPolicyById(
      id,
    )) as RetryPolicyResponseDto;
  }

  @Post('fallback-configs')
  @HttpCode(HttpStatus.CREATED)
  async createFallbackConfig(
    @Body() dto: CreateFallbackConfigDto,
  ): Promise<FallbackConfigResponseDto> {
    return (await this.retryService.createFallbackConfig(
      dto,
    )) as FallbackConfigResponseDto;
  }

  @Patch('fallback-configs/:id')
  async updateFallbackConfig(
    @Param('id') id: string,
    @Body() dto: UpdateFallbackConfigDto,
  ): Promise<FallbackConfigResponseDto> {
    return (await this.retryService.updateFallbackConfig(
      id,
      dto,
    )) as FallbackConfigResponseDto;
  }

  @Delete('fallback-configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFallbackConfig(@Param('id') id: string): Promise<void> {
    await this.retryService.deleteFallbackConfig(id);
  }

  @Get('fallback-configs/:id')
  async findFallbackConfigById(
    @Param('id') id: string,
  ): Promise<FallbackConfigResponseDto> {
    return (await this.retryService.findFallbackConfigById(
      id,
    )) as FallbackConfigResponseDto;
  }
}
