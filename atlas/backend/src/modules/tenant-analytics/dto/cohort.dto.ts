import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class CohortQueryDto {
  /** `YYYY-MM` — the signup month defining the cohort. */
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/)
  cohortMonth: string;
}
