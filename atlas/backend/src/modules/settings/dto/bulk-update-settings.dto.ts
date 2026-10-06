import { ValidateNested, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSettingValueDto } from './create-setting-value.dto';

export class BulkUpdateSettingsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateSettingValueDto)
  items!: CreateSettingValueDto[];
}
