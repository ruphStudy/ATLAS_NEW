import { IsNotEmpty, IsString } from 'class-validator';

export class PluginRequiredReasonDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
