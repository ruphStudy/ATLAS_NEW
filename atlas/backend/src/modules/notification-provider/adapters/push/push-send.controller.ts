import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { PushSendService } from './push-send.service';
import { SendPushNotificationDto } from './push-send.dto';
import { SendNotificationResponseDto } from '../../dto';

@Controller('notification-provider/push')
export class PushSendController {
  constructor(private readonly pushSendService: PushSendService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() dto: SendPushNotificationDto): Promise<SendNotificationResponseDto> {
    return this.pushSendService.send(dto);
  }
}
