import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RollbackSettingValueDto {
  @IsString()
  @IsNotEmpty()
  historyId!: string;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
