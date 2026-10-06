import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RecordUsageDto } from './record-usage.dto';

export class BatchRecordUsageDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => RecordUsageDto)
  records: RecordUsageDto[];
}
