import { IsString, IsNotEmpty, IsObject } from 'class-validator';

export class RuleActionDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  config: Record<string, unknown>;
}
