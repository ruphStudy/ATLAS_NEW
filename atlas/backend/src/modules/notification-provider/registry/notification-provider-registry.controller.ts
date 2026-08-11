import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationProviderRegistryService } from './notification-provider-registry.service';
import {
  RegisterRegistryEntryDto,
  UpdateRegistryEntryDto,
  RegistryEntryFilterDto,
  RegistryEntryResponseDto,
  PaginatedRegistryEntryResponseDto,
} from '../dto';

@Controller('notification-provider/registry')
export class NotificationProviderRegistryController {
  constructor(private readonly registryService: NotificationProviderRegistryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterRegistryEntryDto,
  ): Promise<RegistryEntryResponseDto> {
    return (await this.registryService.register(dto)) as unknown as RegistryEntryResponseDto;
  }

  @Get()
  async findAll(
    @Query() filter: RegistryEntryFilterDto,
  ): Promise<PaginatedRegistryEntryResponseDto> {
    return this.registryService.findAll(filter);
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<RegistryEntryResponseDto> {
    return (await this.registryService.findById(id)) as unknown as RegistryEntryResponseDto;
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateRegistryEntryDto,
  ): Promise<RegistryEntryResponseDto> {
    return (await this.registryService.update(
      id,
      dto,
    )) as unknown as RegistryEntryResponseDto;
  }

  @Post(':id/enable')
  async enable(@Param('id') id: string): Promise<RegistryEntryResponseDto> {
    return (await this.registryService.enable(id)) as unknown as RegistryEntryResponseDto;
  }

  @Post(':id/disable')
  async disable(@Param('id') id: string): Promise<RegistryEntryResponseDto> {
    return (await this.registryService.disable(id)) as unknown as RegistryEntryResponseDto;
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string): Promise<RegistryEntryResponseDto> {
    return (await this.registryService.archive(id)) as unknown as RegistryEntryResponseDto;
  }
}
