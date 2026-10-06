import { IsString } from 'class-validator';

export class GeminiHealthCheckDto {
  @IsString()
  apiKey!: string;
}
