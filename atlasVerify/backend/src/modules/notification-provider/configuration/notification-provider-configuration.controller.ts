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
import { NotificationProviderConfigurationService } from './notification-provider-configuration.service';
import {
  CreateProviderConfigDto,
  UpdateProviderConfigDto,
  ProviderConfigFilterDto,
  ProviderConfigResponseDto,
  PaginatedProviderConfigResponseDto,
  ProviderConfigHistoryResponseDto,
} from '../dto';
import { NotificationProviderConfigStatus } from '../interfaces';

@Controller('notification-provider/configurations')
export class NotificationProviderConfigurationController {
  constructor(private readonly configService: NotificationProviderConfigurationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateProviderConfigDto,
  ): Promise<ProviderConfigResponseDto> {
    return (await this.configService.create(dto)) as unknown as ProviderConfigResponseDto;
  }

  @Get()
  async findAll(
    @Query() filter: ProviderConfigFilterDto,
  ): Promise<PaginatedProviderConfigResponseDto> {
    return this.configService.findAll(filter);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ProviderConfigResponseDto> {
    return (await this.configService.findById(id)) as unknown as ProviderConfigResponseDto;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderConfigDto,
  ): Promise<ProviderConfigResponseDto> {
    return (await this.configService.update(
      id,
      dto,
    )) as unknown as ProviderConfigResponseDto;
  }

  @Post(':id/disable')
  async disable(@Param('id') id: string): Promise<ProviderConfigResponseDto> {
    return (await this.configService.setStatus(
      id,
      NotificationProviderConfigStatus.DISABLED,
    )) as unknown as ProviderConfigResponseDto;
  }

  @Post(':id/enable')
  async enable(@Param('id') id: string): Promise<ProviderConfigResponseDto> {
    return (await this.configService.setStatus(
      id,
      NotificationProviderConfigStatus.ACTIVE,
    )) as unknown as ProviderConfigResponseDto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.configService.remove(id);
  }

  @Get(':id/history')
  async findHistory(
    @Param('id') id: string,
  ): Promise<ProviderConfigHistoryResponseDto[]> {
    return (await this.configService.findHistory(
      id,
    )) as unknown as ProviderConfigHistoryResponseDto[];
  }

  @Post(':id/rollback/:version')
  async rollback(
    @Param('id') id: string,
    @Param('version') version: string,
    @Body() body: { changedBy?: string },
  ): Promise<ProviderConfigResponseDto> {
    return (await this.configService.rollback(
      id,
      Number(version),
      body?.changedBy,
    )) as unknown as ProviderConfigResponseDto;
  }
}
