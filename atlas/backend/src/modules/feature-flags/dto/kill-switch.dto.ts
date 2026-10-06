import { IsNotEmpty, IsString } from 'class-validator';

export class ActivateKillSwitchDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
