import { Controller, Get, Post, Query } from '@nestjs/common';
import { WorkspaceId } from '../../common/decorators/request-context.decorators';
import { AiProviderFactoryService } from './ai-provider-factory.service';
import { AiProviderInstanceResolutionResponseDto, ResolveAiProviderInstanceDto } from './dto';

/**
 * Never returns the raw `IAiProvider` instance or any credential
 * material — only a safe summary of which provider/model was resolved.
 */
@Controller('ai-provider-factory')
export class AiProviderFactoryController {
  constructor(private readonly service: AiProviderFactoryService) {}

  @Get('resolve')
  async resolve(
    @WorkspaceId() workspaceId: string,
    @Query() query: ResolveAiProviderInstanceDto,
  ): Promise<AiProviderInstanceResolutionResponseDto> {
    const result = await this.service.resolve({
      workspaceId,
      capability: query.capability,
      useCase: query.useCase,
      modelId: query.modelId,
      region: query.region,
      accountId: query.accountId,
      preferredProviderKey: query.preferredProviderKey,
    });
    return AiProviderInstanceResolutionResponseDto.from(result.providerKey, result.modelId, result.fromCache);
  }

  @Post('cache/invalidate')
  invalidateCache(@Query('providerKey') providerKey?: string, @WorkspaceId() workspaceId?: string) {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
