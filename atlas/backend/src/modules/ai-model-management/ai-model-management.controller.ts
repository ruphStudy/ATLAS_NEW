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
import { AiModelManagementService } from './ai-model-management.service';
import {
  RegisterAiModelDto,
  UpdateAiModelDto,
  CreateModelConfigurationDto,
  UpdateModelConfigurationDto,
  AiModelFilterDto,
  ModelResolutionDto,
  ModelConfigurationFilterDto,
} from './dto';
import { AiModelCapability } from './interfaces';

@Controller('ai-model-management')
export class AiModelManagementController {
  constructor(private readonly service: AiModelManagementService) {}

  @Post('models')
  @HttpCode(HttpStatus.CREATED)
  async registerModel(@Body() dto: RegisterAiModelDto) {
    return this.service.registerModel(dto);
  }

  @Get('models')
  async findAllModels(@Query() filter: AiModelFilterDto) {
    return this.service.findAllModels(filter);
  }

  @Get('models/:id')
  async findModelById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.findModelById(id, workspaceId);
  }

  @Patch('models/:id')
  @HttpCode(HttpStatus.OK)
  async updateModel(
    @Param('id') id: string,
    @Body() dto: UpdateAiModelDto,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.updateModel(id, dto, workspaceId);
  }

  @Delete('models/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteModel(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    await this.service.deleteModel(id, workspaceId);
  }

  @Patch('models/:id/enable')
  @HttpCode(HttpStatus.OK)
  async enableModel(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.enableModel(id, workspaceId);
  }

  @Patch('models/:id/disable')
  @HttpCode(HttpStatus.OK)
  async disableModel(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.disableModel(id, workspaceId);
  }

  @Patch('models/:id/deprecate')
  @HttpCode(HttpStatus.OK)
  async deprecateModel(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.deprecateModel(id, workspaceId);
  }

  @Patch('models/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveModel(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.archiveModel(id, workspaceId);
  }

  @Post('configurations')
  @HttpCode(HttpStatus.CREATED)
  async createConfiguration(@Body() dto: CreateModelConfigurationDto) {
    return this.service.createConfiguration(dto);
  }

  @Get('configurations')
  async findAllConfigurations(@Query() filter: ModelConfigurationFilterDto) {
    return this.service.findAllConfigurations(filter);
  }

  @Get('configurations/:id')
  async findConfigurationById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findConfigurationById(id, workspaceId);
  }

  @Patch('configurations/:id')
  @HttpCode(HttpStatus.OK)
  async updateConfiguration(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
    @Body() dto: UpdateModelConfigurationDto,
  ) {
    return this.service.updateConfiguration(id, workspaceId, dto);
  }

  @Delete('configurations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteConfiguration(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    await this.service.deleteConfiguration(id, workspaceId);
  }

  @Post('resolve')
  @HttpCode(HttpStatus.OK)
  async resolveModel(@Body() dto: ModelResolutionDto) {
    return this.service.resolveModel(dto);
  }

  @Get('models/:id/compatibility/:capability')
  async validateCompatibility(
    @Param('id') id: string,
    @Param('capability') capability: AiModelCapability,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.validateCompatibility(id, capability, workspaceId);
  }

  @Get('discover')
  async discoverModels(
    @Query('provider') provider?: string,
    @Query('capability') capability?: string,
    @Query('region') region?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    return this.service.discoverModels(provider, capability, region, workspaceId);
  }

  @Post('invalidate-cache')
  @HttpCode(HttpStatus.OK)
  async invalidateCache(@Query('workspaceId') workspaceId?: string) {
    const count = await this.service.invalidateModelCache(workspaceId);
    return { invalidated: count };
  }
}
