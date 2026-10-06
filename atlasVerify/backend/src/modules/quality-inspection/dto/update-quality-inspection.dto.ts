import { PartialType } from '@nestjs/mapped-types';
import { CreateQualityInspectionDto } from './create-quality-inspection.dto';

export class UpdateQualityInspectionDto extends PartialType(CreateQualityInspectionDto) {}
