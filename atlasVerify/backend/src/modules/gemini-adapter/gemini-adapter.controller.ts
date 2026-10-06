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
import { GeminiAdapterService } from './gemini-adapter.service';
import {
  GeminiExecuteDto,
  GeminiHealthCheckDto,
  GeminiExecutionResponseDto,
  GeminiHealthCheckResponseDto,
  GeminiModelInfoResponseDto,
} from './dto';

@Controller('gemini-adapter')
export class GeminiAdapterController {
  constructor(private readonly geminiService: GeminiAdapterService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @Body() dto: GeminiExecuteDto,
    @Headers('x-gemini-api-key') apiKey: string,
  ): Promise<GeminiExecutionResponseDto> {
    return this.geminiService.execute(dto, apiKey);
  }

  @Post('health-check')
  @HttpCode(HttpStatus.OK)
  async healthCheck(
    @Body() dto: GeminiHealthCheckDto,
  ): Promise<GeminiHealthCheckResponseDto> {
    return this.geminiService.healthCheck(dto);
  }

  @Get('models')
  async listModels(): Promise<GeminiModelInfoResponseDto[]> {
    return this.geminiService.listModels();
  }

  @Get('models/:modelId')
  async getModelInfo(
    @Param('modelId') modelId: string,
  ): Promise<GeminiModelInfoResponseDto> {
    return this.geminiService.getModelInfo(modelId);
  }
}
