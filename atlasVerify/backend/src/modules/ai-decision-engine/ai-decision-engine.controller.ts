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
import { AiDecisionEngineService } from './ai-decision-engine.service';
import {
  EvaluateDecisionDto,
  ApproveDecisionDto,
  RejectDecisionDto,
  ReviewDecisionDto,
  OverrideDecisionDto,
  DecisionFilterDto,
  CreateDecisionRuleDto,
  UpdateDecisionRuleDto,
  DecisionResponseDto,
  PaginatedDecisionResponseDto,
  DecisionResultDto,
  DecisionRuleResponseDto,
} from './dto';

@Controller('ai-decision-engine')
export class AiDecisionEngineController {
  constructor(private readonly decisionService: AiDecisionEngineService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluateDecision(
    @Body() dto: EvaluateDecisionDto,
  ): Promise<DecisionResultDto> {
    return (await this.decisionService.evaluateDecision(
      dto,
    )) as DecisionResultDto;
  }

  @Get('decisions')
  async findAllDecisions(
    @Query() filter: DecisionFilterDto,
  ): Promise<PaginatedDecisionResponseDto> {
    return this.decisionService.findAllDecisions(filter);
  }

  @Get('decisions/:id')
  async findDecisionById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DecisionResponseDto> {
    return (await this.decisionService.findDecisionById(
      id,
      workspaceId,
    )) as DecisionResponseDto;
  }

  @Get('decisions/:id/candidates')
  async getCandidates(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.decisionService.getCandidates(id, workspaceId);
  }

  @Get('decisions/:id/history')
  async getHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.decisionService.getHistory(id, workspaceId);
  }

  @Get('decisions/:id/overrides')
  async getOverrides(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.decisionService.getOverrides(id, workspaceId);
  }

  @Post('decisions/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveDecision(
    @Param('id') id: string,
    @Body() dto: ApproveDecisionDto,
  ): Promise<DecisionResponseDto> {
    return (await this.decisionService.approveDecision(
      id,
      dto,
    )) as DecisionResponseDto;
  }

  @Post('decisions/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectDecision(
    @Param('id') id: string,
    @Body() dto: RejectDecisionDto,
  ): Promise<DecisionResponseDto> {
    return (await this.decisionService.rejectDecision(
      id,
      dto,
    )) as DecisionResponseDto;
  }

  @Post('decisions/:id/review')
  @HttpCode(HttpStatus.OK)
  async reviewDecision(
    @Param('id') id: string,
    @Body() dto: ReviewDecisionDto,
  ): Promise<DecisionResponseDto> {
    return (await this.decisionService.reviewDecision(
      id,
      dto,
    )) as DecisionResponseDto;
  }

  @Post('decisions/:id/override')
  @HttpCode(HttpStatus.OK)
  async overrideDecision(
    @Param('id') id: string,
    @Body() dto: OverrideDecisionDto,
  ): Promise<DecisionResponseDto> {
    return (await this.decisionService.overrideDecision(
      id,
      dto,
    )) as DecisionResponseDto;
  }

  @Get('stats')
  async getDecisionStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.decisionService.getDecisionStats(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @Body() dto: CreateDecisionRuleDto,
  ): Promise<DecisionRuleResponseDto> {
    return (await this.decisionService.createRule(
      dto,
    )) as DecisionRuleResponseDto;
  }

  @Patch('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateDecisionRuleDto,
  ): Promise<DecisionRuleResponseDto> {
    return (await this.decisionService.updateRule(
      id,
      dto,
    )) as DecisionRuleResponseDto;
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id') id: string): Promise<void> {
    await this.decisionService.deleteRule(id);
  }

  @Get('rules/:id')
  async findRuleById(@Param('id') id: string): Promise<DecisionRuleResponseDto> {
    return (await this.decisionService.findRuleById(
      id,
    )) as DecisionRuleResponseDto;
  }
}
