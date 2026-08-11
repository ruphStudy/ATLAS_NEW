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
import { NotificationProviderCredentialService } from './notification-provider-credential.service';
import {
  CreateProviderCredentialDto,
  UpdateProviderCredentialDto,
  ProviderCredentialFilterDto,
  ProviderCredentialResponseDto,
  PaginatedProviderCredentialResponseDto,
  ProviderCredentialHistoryResponseDto,
  ConnectionValidationResponseDto,
} from '../dto';

/**
 * Every response here flows through `ProviderCredentialResponseDto.from()` /
 * `ProviderCredentialHistoryResponseDto.from()`, which never touch
 * `encryptedFields` — decrypted plaintext is never returned by any endpoint
 * in this controller. `resolveDecrypted()` on the service is intentionally
 * never called from here.
 */
@Controller('notification-provider/credentials')
export class NotificationProviderCredentialController {
  constructor(private readonly credentialService: NotificationProviderCredentialService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateProviderCredentialDto,
  ): Promise<ProviderCredentialResponseDto> {
    const credential = await this.credentialService.create(dto);
    return ProviderCredentialResponseDto.from(credential as unknown as Record<string, unknown>);
  }

  @Get()
  async findAll(
    @Query() filter: ProviderCredentialFilterDto,
  ): Promise<PaginatedProviderCredentialResponseDto> {
    const result = await this.credentialService.findAll(filter);
    return {
      ...result,
      data: result.data.map((c) =>
        ProviderCredentialResponseDto.from(c as unknown as Record<string, unknown>),
      ),
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string): Promise<ProviderCredentialResponseDto> {
    const credential = await this.credentialService.findById(id);
    return ProviderCredentialResponseDto.from(credential as unknown as Record<string, unknown>);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateProviderCredentialDto,
  ): Promise<ProviderCredentialResponseDto> {
    const credential = await this.credentialService.update(id, dto);
    return ProviderCredentialResponseDto.from(credential as unknown as Record<string, unknown>);
  }

  @Post(':id/rotate')
  async rotate(
    @Param('id') id: string,
    @Body() body: { fields: Record<string, string>; changedBy?: string },
  ): Promise<ProviderCredentialResponseDto> {
    const credential = await this.credentialService.rotate(id, body.fields, body.changedBy);
    return ProviderCredentialResponseDto.from(credential as unknown as Record<string, unknown>);
  }

  @Post(':id/revoke')
  async revoke(@Param('id') id: string): Promise<void> {
    await this.credentialService.remove(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    await this.credentialService.remove(id);
  }

  @Get(':id/history')
  async findHistory(
    @Param('id') id: string,
  ): Promise<ProviderCredentialHistoryResponseDto[]> {
    const history = await this.credentialService.findHistory(id);
    return history.map((h) =>
      ProviderCredentialHistoryResponseDto.from(h as unknown as Record<string, unknown>),
    );
  }

  @Post(':id/validate-connection')
  async validateConnection(
    @Param('id') id: string,
  ): Promise<ConnectionValidationResponseDto> {
    return this.credentialService.validateConnection(id);
  }
}
