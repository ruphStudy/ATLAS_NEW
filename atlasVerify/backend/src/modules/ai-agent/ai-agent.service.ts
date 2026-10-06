import { Injectable, Logger } from '@nestjs/common';
import { AiAgentRepository } from './ai-agent.repository';
import { AiAgentEventQueue } from './jobs';
import { AiOrchestratorService } from '@modules/ai-orchestrator/ai-orchestrator.service';
import {
  CreateAiAgentDto,
  UpdateAiAgentDto,
  AiAgentFilterDto,
  ExecuteAgentDto,
  CreateAgentConfigurationDto,
  UpdateAgentConfigurationDto,
  ExecutionFilterDto,
  AiAgentResponseDto,
  PaginatedAiAgentResponseDto,
  AgentConfigurationResponseDto,
  AgentExecutionResponseDto,
  PaginatedExecutionResponseDto,
  AgentExecutionResultDto,
} from './dto';
import {
  IAiAgent,
  IAiAgentConfiguration,
  IAiAgentExecution,
  IAgentExecutionResult,
  AiAgentStatus,
  AiAgentExecutionStatus,
  AiAgentEvent,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { BusinessRuleException } from '@common/exceptions/business-rule.exception';
import { DuplicateResourceException } from '@common/exceptions/duplicate-resource.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly repository: AiAgentRepository,
    private readonly eventQueue: AiAgentEventQueue,
    private readonly orchestratorService: AiOrchestratorService,
  ) {}

  async createAgent(dto: CreateAiAgentDto): Promise<IAiAgent> {
    const existing = await this.repository.findAgentByKey(
      dto.key,
      dto.workspaceId,
    );

    if (existing) {
      throw new DuplicateResourceException(
        'Agent with this key already exists',
        ErrorCode.DUPLICATE_RESOURCE,
      );
    }

    const data = {
      workspaceId: dto.workspaceId || null,
      key: dto.key,
      name: dto.name,
      description: dto.description,
      type: dto.type,
      status: dto.status ?? AiAgentStatus.ACTIVE,
      capabilities: dto.capabilities,
      primaryCapability: dto.primaryCapability,
      persona: dto.persona,
      instructions: dto.instructions,
      systemPrompt: dto.systemPrompt,
      modelId: dto.modelId,
      temperature: dto.temperature,
      maxTokens: dto.maxTokens,
      topP: dto.topP,
      tools: dto.tools || [],
      toolChoice: dto.toolChoice,
      contextWindowSize: dto.contextWindowSize,
      maxTurns: dto.maxTurns,
      enableMemory: dto.enableMemory ?? false,
      enableContext: dto.enableContext ?? true,
      timeout: dto.timeout,
      maxRetries: dto.maxRetries ?? 3,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
      isDefault: dto.isDefault ?? false,
      isPublic: dto.isPublic ?? false,
    };

    const agent = (await this.repository.createAgent(data)) as IAiAgent;

    await this.eventQueue.publish({
      event: AiAgentEvent.AGENT_CREATED,
      workspaceId: agent.workspaceId || '',
      agentId: agent.id,
    });

    return agent;
  }

  async updateAgent(
    id: string,
    dto: UpdateAiAgentDto,
    workspaceId?: string,
  ): Promise<IAiAgent> {
    await this.findAgentById(id, workspaceId);

    const updated = (await this.repository.updateAgent(id, dto)) as IAiAgent;

    await this.eventQueue.publish({
      event: AiAgentEvent.AGENT_UPDATED,
      workspaceId: updated.workspaceId || '',
      agentId: updated.id,
    });

    return updated;
  }

  async activateAgent(id: string, workspaceId?: string): Promise<IAiAgent> {
    const agent = await this.findAgentById(id, workspaceId);

    const activated = await this.repository.updateAgent(id, {
      status: AiAgentStatus.ACTIVE,
    });

    await this.eventQueue.publish({
      event: AiAgentEvent.AGENT_ACTIVATED,
      workspaceId: activated.workspaceId || '',
      agentId: activated.id,
    });

    return activated as IAiAgent;
  }

  async deactivateAgent(id: string, workspaceId?: string): Promise<IAiAgent> {
    const agent = await this.findAgentById(id, workspaceId);

    const deactivated = await this.repository.updateAgent(id, {
      status: AiAgentStatus.INACTIVE,
    });

    await this.eventQueue.publish({
      event: AiAgentEvent.AGENT_DEACTIVATED,
      workspaceId: deactivated.workspaceId || '',
      agentId: deactivated.id,
    });

    return deactivated as IAiAgent;
  }

  async archiveAgent(id: string, workspaceId?: string): Promise<IAiAgent> {
    const agent = await this.findAgentById(id, workspaceId);

    const archived = await this.repository.updateAgent(id, {
      status: AiAgentStatus.ARCHIVED,
    });

    await this.eventQueue.publish({
      event: AiAgentEvent.AGENT_ARCHIVED,
      workspaceId: archived.workspaceId || '',
      agentId: archived.id,
    });

    return archived as IAiAgent;
  }

  async deleteAgent(id: string, workspaceId?: string): Promise<void> {
    await this.findAgentById(id, workspaceId);
    await this.repository.deleteAgent(id);
  }

  async findAgentById(id: string, workspaceId?: string): Promise<IAiAgent> {
    const agent = await this.repository.findAgentById(id, workspaceId);
    if (!agent) {
      throw new ResourceNotFoundException(
        'Agent not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return agent;
  }

  async findAllAgents(
    filter: AiAgentFilterDto,
  ): Promise<PaginatedAiAgentResponseDto> {
    const [data, total] = await this.repository.findAllAgents(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AiAgentResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async createConfiguration(
    dto: CreateAgentConfigurationDto,
  ): Promise<IAiAgentConfiguration> {
    await this.findAgentById(dto.agentId, dto.workspaceId);

    const data = {
      workspaceId: dto.workspaceId,
      agentId: dto.agentId,
      useCase: dto.useCase,
      overrideInstructions: dto.overrideInstructions,
      overrideSystemPrompt: dto.overrideSystemPrompt,
      customModelId: dto.customModelId,
      customParameters: dto.customParameters || null,
      customTools: dto.customTools || null,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      metadata: dto.metadata || {},
    };

    return (await this.repository.createConfiguration(
      data,
    )) as IAiAgentConfiguration;
  }

  async updateConfiguration(
    id: string,
    workspaceId: string,
    dto: UpdateAgentConfigurationDto,
  ): Promise<IAiAgentConfiguration> {
    await this.findConfigurationById(id, workspaceId);

    return (await this.repository.updateConfiguration(
      id,
      workspaceId,
      dto,
    )) as IAiAgentConfiguration;
  }

  async deleteConfiguration(id: string, workspaceId: string): Promise<void> {
    await this.findConfigurationById(id, workspaceId);
    await this.repository.deleteConfiguration(id, workspaceId);
  }

  async findConfigurationById(
    id: string,
    workspaceId: string,
  ): Promise<IAiAgentConfiguration> {
    const config = await this.repository.findConfigurationById(id, workspaceId);
    if (!config) {
      throw new ResourceNotFoundException(
        'Agent configuration not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return config;
  }

  async executeAgent(dto: ExecuteAgentDto): Promise<IAgentExecutionResult> {
    const agent = await this.findAgentById(dto.agentId, dto.workspaceId);

    if (agent.status !== AiAgentStatus.ACTIVE) {
      throw new BusinessRuleException(
        'Agent is not active',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const execution = await this.repository.createExecution({
      workspaceId: dto.workspaceId,
      agentId: dto.agentId,
      sessionId: dto.sessionId,
      input: dto.input,
      context: dto.context || null,
      status: AiAgentExecutionStatus.PENDING,
      startTime: new Date(),
      turns: 0,
      stepsCompleted: 0,
      userId: dto.userId,
      metadata: dto.metadata || {},
    });

    await this.eventQueue.publish({
      event: AiAgentEvent.EXECUTION_STARTED,
      workspaceId: dto.workspaceId,
      agentId: dto.agentId,
      executionId: execution.id,
    });

    try {
      await this.repository.updateExecution(execution.id, {
        status: AiAgentExecutionStatus.RUNNING,
      });

      const result = await this.processExecution(agent, execution, dto.input, dto.context);

      await this.repository.updateExecution(execution.id, {
        status: AiAgentExecutionStatus.COMPLETED,
        output: result.output,
        endTime: new Date(),
        totalTokens: result.totalTokens,
        totalCost: result.totalCost,
        turns: result.turns,
      });

      await this.eventQueue.publish({
        event: AiAgentEvent.EXECUTION_COMPLETED,
        workspaceId: dto.workspaceId,
        agentId: dto.agentId,
        executionId: execution.id,
        status: 'completed',
      });

      return result;
    } catch (error) {
      await this.repository.updateExecution(execution.id, {
        status: AiAgentExecutionStatus.FAILED,
        endTime: new Date(),
        errorCode: (error as any).code || 'EXECUTION_ERROR',
        errorMessage: (error as Error).message,
      });

      await this.eventQueue.publish({
        event: AiAgentEvent.EXECUTION_FAILED,
        workspaceId: dto.workspaceId,
        agentId: dto.agentId,
        executionId: execution.id,
        status: 'failed',
      });

      throw error;
    }
  }

  private async processExecution(
    agent: IAiAgent,
    execution: IAiAgentExecution,
    input: string,
    context?: Record<string, unknown>,
  ): Promise<IAgentExecutionResult> {
    const startTime = Date.now();
    
    const systemPrompt = agent.systemPrompt || agent.instructions || '';
    const fullPrompt = this.buildPrompt(systemPrompt, input, context);

    const orchestratorResult = await this.orchestratorService.executeRequest({
      workspaceId: execution.workspaceId,
      useCase: 'agent-execution',
      capability: agent.primaryCapability,
      prompt: fullPrompt,
      context: context,
      parameters: {
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        topP: agent.topP,
      },
      executionMode: 'SYNC',
      maxRetries: agent.maxRetries,
      timeout: agent.timeout,
      requestMetadata: {
        agentId: agent.id,
        agentExecutionId: execution.id,
      },
    });

    const turnContext = await this.repository.createContext({
      executionId: execution.id,
      workspaceId: execution.workspaceId,
      turnNumber: 1,
      userMessage: input,
      agentResponse: orchestratorResult.content,
      contextData: context || null,
      tokens: orchestratorResult.totalTokens,
      cost: orchestratorResult.cost,
      latency: orchestratorResult.latency,
    });

    await this.eventQueue.publish({
      event: AiAgentEvent.TURN_COMPLETED,
      workspaceId: execution.workspaceId,
      agentId: agent.id,
      executionId: execution.id,
    });

    const duration = Date.now() - startTime;

    return {
      executionId: execution.id,
      output: orchestratorResult.content,
      turns: 1,
      totalTokens: orchestratorResult.totalTokens,
      totalCost: orchestratorResult.cost,
      duration,
      metadata: {
        provider: orchestratorResult.provider,
        model: orchestratorResult.modelKey,
      },
    };
  }

  private buildPrompt(
    systemPrompt: string,
    input: string,
    context?: Record<string, unknown>,
  ): string {
    let prompt = systemPrompt ? `${systemPrompt}\n\n` : '';
    
    if (context && Object.keys(context).length > 0) {
      prompt += `Context: ${JSON.stringify(context)}\n\n`;
    }
    
    prompt += `User: ${input}`;
    
    return prompt;
  }

  async cancelExecution(id: string, workspaceId: string): Promise<IAiAgentExecution> {
    const execution = await this.repository.findExecutionById(id);
    
    if (!execution) {
      throw new ResourceNotFoundException(
        'Execution not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }

    if (execution.workspaceId !== workspaceId) {
      throw new BusinessRuleException(
        'Execution does not belong to workspace',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    if (
      execution.status === AiAgentExecutionStatus.COMPLETED ||
      execution.status === AiAgentExecutionStatus.FAILED ||
      execution.status === AiAgentExecutionStatus.CANCELLED
    ) {
      throw new BusinessRuleException(
        'Cannot cancel execution in current status',
        ErrorCode.BUSINESS_RULE_VIOLATION,
      );
    }

    const cancelled = await this.repository.updateExecution(id, {
      status: AiAgentExecutionStatus.CANCELLED,
      endTime: new Date(),
    });

    await this.eventQueue.publish({
      event: AiAgentEvent.EXECUTION_CANCELLED,
      workspaceId,
      agentId: execution.agentId,
      executionId: id,
    });

    return cancelled as IAiAgentExecution;
  }

  async findExecutionById(id: string, workspaceId: string): Promise<IAiAgentExecution> {
    const execution = await this.repository.findExecutionById(id);
    
    if (!execution || execution.workspaceId !== workspaceId) {
      throw new ResourceNotFoundException(
        'Execution not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    
    return execution;
  }

  async findAllExecutions(
    filter: ExecutionFilterDto,
  ): Promise<PaginatedExecutionResponseDto> {
    const [data, total] = await this.repository.findAllExecutions(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AgentExecutionResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getAgentStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getAgentStats(workspaceId, startDate, endDate);
  }
}
