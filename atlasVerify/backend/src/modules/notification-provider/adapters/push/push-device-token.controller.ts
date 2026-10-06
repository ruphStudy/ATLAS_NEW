import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PushDeviceTokenService } from './push-device-token.service';
import { RegisterDeviceTokenDto, RefreshDeviceTokenDto, DeviceTokenFilterDto } from './push-device-token.dto';

@Controller('notification-provider/push/tokens')
export class PushDeviceTokenController {
  constructor(private readonly tokenService: PushDeviceTokenService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async register(@Body() dto: RegisterDeviceTokenDto) {
    return this.tokenService.register(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDeviceTokenDto) {
    return this.tokenService.refresh(dto);
  }

  @Get()
  async findAll(@Query() filter: DeviceTokenFilterDto) {
    return this.tokenService.findAll(filter);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Query('workspaceId') workspaceId: string) {
    return this.tokenService.findById(id, workspaceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Query('workspaceId') workspaceId: string): Promise<void> {
    await this.tokenService.remove(id, workspaceId);
  }
}
