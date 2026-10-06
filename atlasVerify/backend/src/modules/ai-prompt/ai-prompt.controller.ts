import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiPromptService } from './ai-prompt.service';
import {
  CreateAiPromptDto,
  UpdateAiPromptDto,
  AiPromptFilterDto,
  ResolvePromptDto,
  CompilePromptDto,
  CreatePromptVersionDto,
  RollbackPromptDto,
} from './dto';

@Controller('ai-prompt')
export class AiPromptController {
  constructor(private readonly service: AiPromptService) {}

  @Post('prompts')
  @HttpCode(HttpStatus.CREATED)
  async createPrompt(@Body() dto: CreateAiPromptDto) {
    return this.service.createPrompt(dto);
  }

  @Get('prompts')
  async findAllPrompts(@Query() filter: AiPromptFilterDto) {
    return this.service.findAllPrompts(filter);
  }

  @Get('prompts/:id')
  async findPromptById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.findPromptById(id, workspaceId);
  }

  @Patch('prompts/:id')
  @HttpCode(HttpStatus.OK)
  async updatePrompt(
    @Param('id') id: string,
    @Body() dto: UpdateAiPromptDto,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.updatePrompt(id, dto, workspaceId);
  }

  @Delete('prompts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePrompt(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    await this.service.deletePrompt(id, workspaceId);
  }

  @Post('prompts/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishPrompt(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('publishedBy') publishedBy?: string,
  ) {
    return this.service.publishPrompt(id, workspaceId, publishedBy);
  }

  @Patch('prompts/:id/deprecate')
  @HttpCode(HttpStatus.OK)
  async deprecatePrompt(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.deprecatePrompt(id, workspaceId);
  }

  @Patch('prompts/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archivePrompt(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.archivePrompt(id, workspaceId);
  }

  @Post('versions')
  @HttpCode(HttpStatus.CREATED)
  async createVersion(@Body() dto: CreatePromptVersionDto) {
    return this.service.createVersion(dto);
  }

  @Get('prompts/:id/versions')
  async findVersionsByPromptId(@Param('id') promptId: string) {
    return this.service.findVersionsByPromptId(promptId);
  }

  @Post('rollback')
  @HttpCode(HttpStatus.OK)
  async rollbackPrompt(@Body() dto: RollbackPromptDto) {
    return this.service.rollbackPrompt(dto);
  }

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  async resolvePrompt(@Body() dto: ResolvePromptDto) {
    return this.service.resolvePrompt(dto);
  }

  @Post('compile')
  @HttpCode(HttpStatus.OK)
  async compilePrompt(@Body() dto: CompilePromptDto) {
    return this.service.compilePrompt(dto);
  }

  @Get('prompts/:id/stats')
  async getPromptStats(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.service.getPromptStats(id, start, end);
  }

  @Post('invalidate-cache')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(
    @Query('workspaceId') workspaceId?: string,
    @Query('pattern') pattern?: string,
  ) {
    const count = await this.service.invalidateCache(workspaceId, pattern);
    return { invalidated: count };
  }
}
