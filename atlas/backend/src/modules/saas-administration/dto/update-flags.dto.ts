import { IsArray, IsString } from 'class-validator';

export class UpdateInternalFlagsDto {
  @IsArray()
  @IsString({ each: true })
  internalFlags!: string[];
}
