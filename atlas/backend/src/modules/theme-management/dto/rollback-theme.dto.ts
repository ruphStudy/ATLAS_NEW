import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RollbackThemeDto {
  @IsString()
  @IsNotEmpty()
  historyId: string;

  @IsString()
  @IsOptional()
  changeReason?: string;
}
