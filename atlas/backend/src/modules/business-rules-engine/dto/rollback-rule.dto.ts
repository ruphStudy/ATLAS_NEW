import { IsString, IsNotEmpty } from 'class-validator';

export class RollbackRuleDto {
  @IsString()
  @IsNotEmpty()
  historyId!: string;

  @IsString()
  @IsNotEmpty()
  changeReason!: string;
}
