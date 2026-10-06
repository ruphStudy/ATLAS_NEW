import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { AiRecommendationFeedbackType } from '../interfaces';

export class SubmitFeedbackDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiRecommendationFeedbackType)
  @IsNotEmpty()
  feedbackType!: AiRecommendationFeedbackType;

  @IsString()
  @IsOptional()
  itemId?: string;

  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
