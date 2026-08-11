import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MAX_RATING, MIN_RATING } from '../constants';

export class SubmitReviewDto {
  @IsInt()
  @Min(MIN_RATING)
  @Max(MAX_RATING)
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
