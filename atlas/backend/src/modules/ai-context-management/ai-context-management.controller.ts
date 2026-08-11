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
import { AiContextManagementService } from './ai-context-management.service';
import {
  CreateAiContextDto,
  UpdateAiContextDto,
  ContextFilterDto,
  ResolveContextDto,
  MergeContextDto,
} from './dto';

@Controller('ai-context-management')
export class AiContextManagementController {
  constructor(private readonly service: AiContextManagementService) {}

  @Post('contexts')
  @HttpCode(HttpStatus.CREATED)
  async createContext(@Body() dto: CreateAiContextDto) {
    return this.service.createContext(dto);
  }

  @Get('contexts')
  async findAllContexts(@Query() filter: ContextFilterDto) {
    return this.service.findAllContexts(filter);
  }

  @Get('contexts/:id')
  async findContextById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findContextById(id, workspaceId);
  }

  @Patch('contexts/:id')
  @HttpCode(HttpStatus.OK)
  async updateContext(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateAiContextDto,
  ) {
    return this.service.updateContext(id, workspaceId, dto);
  }

  @Delete('contexts/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteContext(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    await this.service.deleteContext(id, workspaceId);
  }

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  async resolveContext(@Body() dto: ResolveContextDto) {
    return this.service.resolveContext(dto);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  async mergeContexts(@Body() dto: MergeContextDto) {
    return this.service.mergeContexts(dto);
  }

  @Post('contexts/:id/summarize')
  @HttpCode(HttpStatus.OK)
  async summarizeContext(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.summarizeContext(id, workspaceId);
  }

  @Post('contexts/:id/trim')
  @HttpCode(HttpStatus.OK)
  async trimContext(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('maxTokens') maxTokens: number,
  ) {
    return this.service.trimContext(id, workspaceId, maxTokens);
  }

  @Post('contexts/:id/branch')
  @HttpCode(HttpStatus.CREATED)
  async branchContext(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Query('correlationId') correlationId?: string,
  ) {
    return this.service.branchContext(id, workspaceId, correlationId);
  }

  @Patch('contexts/:id/expire')
  @HttpCode(HttpStatus.OK)
  async expireContext(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.expireContext(id, workspaceId);
  }

  @Patch('contexts/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveContext(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.archiveContext(id, workspaceId);
  }

  @Get('contexts/:id/versions')
  async getContextVersions(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.getContextVersions(id, workspaceId);
  }

  @Get('cache/:cacheKey')
  async getCachedContext(@Param('cacheKey') cacheKey: string) {
    return this.service.getCachedContext(cacheKey);
  }

  @Post('contexts/:id/invalidate-cache')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    await this.service.invalidateContextCache(id, workspaceId);
  }

  @Get('stats')
  async getContextStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.service.getContextStats(workspaceId, start, end);
  }
}
