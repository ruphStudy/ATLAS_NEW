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
import { OpenaiAdapterService } from './openai-adapter.service';
import {
  OpenAiExecuteDto,
  OpenAiHealthCheckDto,
  OpenAiExecutionResponseDto,
  OpenAiHealthCheckResponseDto,
  OpenAiModelInfoResponseDto,
} from './dto';

@Controller('openai-adapter')
export class OpenaiAdapterController {
  constructor(private readonly openaiService: OpenaiAdapterService) {}

  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @Body() dto: OpenAiExecuteDto,
    @Headers('x-openai-api-key') apiKey: string,
  ): Promise<OpenAiExecutionResponseDto> {
    return this.openaiService.execute(dto, apiKey);
  }

  @Post('health-check')
  @HttpCode(HttpStatus.OK)
  async healthCheck(
    @Body() dto: OpenAiHealthCheckDto,
  ): Promise<OpenAiHealthCheckResponseDto> {
    return this.openaiService.healthCheck(dto);
  }

  @Get('models')
  async listModels(): Promise<OpenAiModelInfoResponseDto[]> {
    return this.openaiService.listModels();
  }

  @Get('models/:modelId')
  async getModelInfo(
    @Param('modelId') modelId: string,
  ): Promise<OpenAiModelInfoResponseDto> {
    return this.openaiService.getModelInfo(modelId);
  }
}
