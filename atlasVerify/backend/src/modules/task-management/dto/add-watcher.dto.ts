import { IsString, IsOptional } from 'class-validator';

export class AddWatcherDto {
  /** Omit to watch the task as yourself. */
  @IsString()
  @IsOptional()
  userId?: string;
}
