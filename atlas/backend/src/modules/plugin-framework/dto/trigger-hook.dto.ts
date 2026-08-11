import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class TriggerHookDto {
  @IsString()
  @IsNotEmpty()
  hookName: string;

  @IsObject()
  payload: Record<string, unknown>;
}
