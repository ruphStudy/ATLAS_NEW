import { IsArray, ArrayMinSize, ArrayMaxSize, IsString } from 'class-validator';

export class BulkFileIdsDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  ids: string[];
}
