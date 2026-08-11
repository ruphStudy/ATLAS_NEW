import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { AnthropicAdapterService } from './anthropic-adapter.service';
import {
  AnthropicExecuteDto,
  AnthropicHealthCheckDto,
  AnthropicExecutionResponseDto,
  AnthropicHealthCheckResponseDto,
  AnthropicModelInfoResponseDto,
} from './dto';

@Controller('anthropic-adapter')
export class AnthropicAdapterController {
  constructor(private readonly anthropicService: AnthropicAdapterService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @Body() dto: AnthropicExecuteDto,
    @Headers('x-anthropic-api-key') apiKey: string,
  ): Promise<AnthropicExecutionResponseDto> {
    return this.anthropicService.execute(dto, apiKey);
  }

  @Post('health-check')
  @HttpCode(HttpStatus.OK)
  async healthCheck(
    @Body() dto: AnthropicHealthCheckDto,
  ): Promise<AnthropicHealthCheckResponseDto> {
    return this.anthropicService.healthCheck(dto);
  }

  @Get('models')
  async listModels(): Promise<AnthropicModelInfoResponseDto[]> {
    return this.anthropicService.listModels();
  }

  @Get('models/:modelId')
  async getModelInfo(
    @Param('modelId') modelId: string,
  ): Promise<AnthropicModelInfoResponseDto> {
    return this.anthropicService.getModelInfo(modelId);
  }
}
