import { IsString } from 'class-validator';

export class AnthropicHealthCheckDto {
  @IsString()
  apiKey: string;
}
