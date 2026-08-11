import { IsObject, IsOptional, IsString } from 'class-validator';

export class TestWebhookDto {
  @IsString()
  @IsOptional()
  eventType?: string;

  @IsObject()
  @IsOptional()
  payload?: Record<string, unknown>;
}
