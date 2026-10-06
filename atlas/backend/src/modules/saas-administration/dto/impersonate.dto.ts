import { IsNotEmpty, IsString } from 'class-validator';

export class StartImpersonationDto {
  @IsString()
  @IsNotEmpty()
  targetUserId!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
