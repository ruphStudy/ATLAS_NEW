import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean } from 'class-validator';

export class CreateChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsInt()
  @IsOptional()
  order?: number;
}

export class UpdateChecklistItemDto {
  @IsString()
  @IsOptional()
  text?: string;

  @IsBoolean()
  @IsOptional()
  isDone?: boolean;

  @IsInt()
  @IsOptional()
  order?: number;
}
