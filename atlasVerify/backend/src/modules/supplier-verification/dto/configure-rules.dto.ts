import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RuleConfigDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean = true;

  @ApiProperty({ example: 20, minimum: 1, maximum: 100 })
  @IsInt()
  @Min(1)
  @Max(100)
  weight: number = 10;

  @ApiProperty({ example: false })
  @IsBoolean()
  required: boolean = false;
}

export class ConfigureRulesDto {
  @ApiPropertyOptional({ type: RuleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConfigDto)
  businessRegistration?: RuleConfigDto;

  @ApiPropertyOptional({ type: RuleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConfigDto)
  gstVat?: RuleConfigDto;

  @ApiPropertyOptional({ type: RuleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConfigDto)
  contactInfo?: RuleConfigDto;

  @ApiPropertyOptional({ type: RuleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConfigDto)
  websiteAvailability?: RuleConfigDto;

  @ApiPropertyOptional({ type: RuleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConfigDto)
  emailValidity?: RuleConfigDto;

  @ApiPropertyOptional({ type: RuleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConfigDto)
  phoneValidity?: RuleConfigDto;

  @ApiPropertyOptional({ type: RuleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConfigDto)
  businessAge?: RuleConfigDto;

  @ApiPropertyOptional({ type: RuleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConfigDto)
  productCatalog?: RuleConfigDto;

  @ApiPropertyOptional({ type: RuleConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuleConfigDto)
  profileCompleteness?: RuleConfigDto;

  @ApiPropertyOptional({ example: 70, minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scoreThreshold?: number;
}
