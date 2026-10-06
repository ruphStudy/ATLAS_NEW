import { IsString, IsNotEmpty } from 'class-validator';

export class OpenAiHealthCheckDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  apiKey: string;
}
