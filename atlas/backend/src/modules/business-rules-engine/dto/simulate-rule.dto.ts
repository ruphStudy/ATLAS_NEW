import { IsObject } from 'class-validator';

export class SimulateRuleDto {
  @IsObject()
  input!: Record<string, unknown>;
}
