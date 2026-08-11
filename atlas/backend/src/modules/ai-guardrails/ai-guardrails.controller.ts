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
import { AiGuardrailsService } from './ai-guardrails.service';
import {
  EvaluateGuardrailDto,
  CreateGuardrailRuleDto,
  UpdateGuardrailRuleDto,
  GuardrailRuleFilterDto,
  CreateGuardrailOverrideDto,
  UpdateGuardrailOverrideDto,
  GuardrailOverrideFilterDto,
  GuardrailEvaluationFilterDto,
  GuardrailIncidentFilterDto,
  UpdateGuardrailIncidentDto,
  GuardrailApprovalFilterDto,
  DecideGuardrailApprovalDto,
  GuardrailRuleResponseDto,
  PaginatedGuardrailRuleResponseDto,
  GuardrailRuleVersionResponseDto,
  GuardrailOverrideResponseDto,
  PaginatedGuardrailOverrideResponseDto,
  GuardrailEvaluationOutcomeResponseDto,
  GuardrailEvaluationResponseDto,
  PaginatedGuardrailEvaluationResponseDto,
  GuardrailEvaluationResultResponseDto,
  GuardrailIncidentResponseDto,
  PaginatedGuardrailIncidentResponseDto,
  GuardrailApprovalResponseDto,
  PaginatedGuardrailApprovalResponseDto,
} from './dto';

@Controller('ai-guardrails')
export class AiGuardrailsController {
  constructor(private readonly guardrailsService: AiGuardrailsService) {}

  @Post('evaluate')
  @HttpCode(HttpStatus.OK)
  async evaluate(
    @Body() dto: EvaluateGuardrailDto,
  ): Promise<GuardrailEvaluationOutcomeResponseDto> {
    return (await this.guardrailsService.evaluate(
      dto,
    )) as GuardrailEvaluationOutcomeResponseDto;
  }

  @Post('rules')
  @HttpCode(HttpStatus.CREATED)
  async createRule(
    @Body() dto: CreateGuardrailRuleDto,
  ): Promise<GuardrailRuleResponseDto> {
    return (await this.guardrailsService.createRule(
      dto,
    )) as unknown as GuardrailRuleResponseDto;
  }

  @Get('rules')
  async findAllRules(
    @Query() filter: GuardrailRuleFilterDto,
  ): Promise<PaginatedGuardrailRuleResponseDto> {
    return this.guardrailsService.findAllRules(filter);
  }

  @Get('rules/:id')
  async findRuleById(
    @Param('id') id: string,
  ): Promise<GuardrailRuleResponseDto> {
    return (await this.guardrailsService.findRuleById(
      id,
    )) as unknown as GuardrailRuleResponseDto;
  }

  @Patch('rules/:id')
  async updateRule(
    @Param('id') id: string,
    @Body() dto: UpdateGuardrailRuleDto,
  ): Promise<GuardrailRuleResponseDto> {
    return (await this.guardrailsService.updateRule(
      id,
      dto,
    )) as unknown as GuardrailRuleResponseDto;
  }

  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id') id: string): Promise<void> {
    await this.guardrailsService.deleteRule(id);
  }

  @Get('rules/:id/versions')
  async findRuleVersions(
    @Param('id') id: string,
  ): Promise<GuardrailRuleVersionResponseDto[]> {
    return (await this.guardrailsService.findRuleVersions(
      id,
    )) as unknown as GuardrailRuleVersionResponseDto[];
  }

  @Post('overrides')
  @HttpCode(HttpStatus.CREATED)
  async createOverride(
    @Body() dto: CreateGuardrailOverrideDto,
  ): Promise<GuardrailOverrideResponseDto> {
    return (await this.guardrailsService.createOverride(
      dto,
    )) as unknown as GuardrailOverrideResponseDto;
  }

  @Get('overrides')
  async findAllOverrides(
    @Query() filter: GuardrailOverrideFilterDto,
  ): Promise<PaginatedGuardrailOverrideResponseDto> {
    return this.guardrailsService.findAllOverrides(filter);
  }

  @Get('overrides/:id')
  async findOverrideById(
    @Param('id') id: string,
  ): Promise<GuardrailOverrideResponseDto> {
    return (await this.guardrailsService.findOverrideById(
      id,
    )) as unknown as GuardrailOverrideResponseDto;
  }

  @Patch('overrides/:id')
  async updateOverride(
    @Param('id') id: string,
    @Body() dto: UpdateGuardrailOverrideDto,
  ): Promise<GuardrailOverrideResponseDto> {
    return (await this.guardrailsService.updateOverride(
      id,
      dto,
    )) as unknown as GuardrailOverrideResponseDto;
  }

  @Delete('overrides/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOverride(@Param('id') id: string): Promise<void> {
    await this.guardrailsService.deleteOverride(id);
  }

  @Get('evaluations')
  async findAllEvaluations(
    @Query() filter: GuardrailEvaluationFilterDto,
  ): Promise<PaginatedGuardrailEvaluationResponseDto> {
    return this.guardrailsService.findAllEvaluations(filter);
  }

  @Get('evaluations/:id')
  async findEvaluationById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<GuardrailEvaluationResponseDto> {
    return (await this.guardrailsService.findEvaluationById(
      id,
      workspaceId,
    )) as unknown as GuardrailEvaluationResponseDto;
  }

  @Get('evaluations/:id/results')
  async getEvaluationResults(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<GuardrailEvaluationResultResponseDto[]> {
    return (await this.guardrailsService.getEvaluationResults(
      id,
      workspaceId,
    )) as unknown as GuardrailEvaluationResultResponseDto[];
  }

  @Get('incidents')
  async findAllIncidents(
    @Query() filter: GuardrailIncidentFilterDto,
  ): Promise<PaginatedGuardrailIncidentResponseDto> {
    return this.guardrailsService.findAllIncidents(filter);
  }

  @Get('incidents/:id')
  async findIncidentById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<GuardrailIncidentResponseDto> {
    return (await this.guardrailsService.findIncidentById(
      id,
      workspaceId,
    )) as unknown as GuardrailIncidentResponseDto;
  }

  @Patch('incidents/:id')
  async updateIncident(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateGuardrailIncidentDto,
  ): Promise<GuardrailIncidentResponseDto> {
    return (await this.guardrailsService.updateIncident(
      id,
      workspaceId,
      dto,
    )) as unknown as GuardrailIncidentResponseDto;
  }

  @Get('incidents/:id/history')
  async getIncidentHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.guardrailsService.getIncidentHistory(id, workspaceId);
  }

  @Get('approvals')
  async findAllApprovals(
    @Query() filter: GuardrailApprovalFilterDto,
  ): Promise<PaginatedGuardrailApprovalResponseDto> {
    return this.guardrailsService.findAllApprovals(filter);
  }

  @Get('approvals/:id')
  async findApprovalById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<GuardrailApprovalResponseDto> {
    return (await this.guardrailsService.findApprovalById(
      id,
      workspaceId,
    )) as unknown as GuardrailApprovalResponseDto;
  }

  @Post('approvals/:id/decide')
  async decideApproval(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: DecideGuardrailApprovalDto,
  ): Promise<GuardrailApprovalResponseDto> {
    return (await this.guardrailsService.decideApproval(
      id,
      workspaceId,
      dto,
    )) as unknown as GuardrailApprovalResponseDto;
  }

  @Get('approvals/:id/history')
  async getApprovalHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.guardrailsService.getApprovalHistory(id, workspaceId);
  }

  @Get('stats')
  async getGuardrailStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.guardrailsService.getGuardrailStats(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}
