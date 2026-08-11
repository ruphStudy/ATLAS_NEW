import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationDeliveryService } from './notification-delivery.service';
import {
  SendNotificationDto,
  DeliveryFilterDto,
  DeliveryResponseDto,
  PaginatedDeliveryResponseDto,
  SendNotificationResponseDto,
} from '../dto';

@Controller('notification-provider/deliveries')
export class NotificationDeliveryController {
  constructor(private readonly deliveryService: NotificationDeliveryService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() dto: SendNotificationDto): Promise<SendNotificationResponseDto> {
    return this.deliveryService.send(dto);
  }

  @Get()
  async findAll(
    @Query() filter: DeliveryFilterDto,
  ): Promise<PaginatedDeliveryResponseDto> {
    return this.deliveryService.findAll(filter);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DeliveryResponseDto> {
    return (await this.deliveryService.findById(
      id,
      workspaceId,
    )) as unknown as DeliveryResponseDto;
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<DeliveryResponseDto> {
    return (await this.deliveryService.cancel(
      id,
      workspaceId,
    )) as unknown as DeliveryResponseDto;
  }

  @Post('process-scheduled')
  async processScheduled(
    @Query('workspaceId') workspaceId: string,
  ): Promise<{ processed: number }> {
    const processed = await this.deliveryService.processDueScheduled(workspaceId);
    return { processed };
  }
}
