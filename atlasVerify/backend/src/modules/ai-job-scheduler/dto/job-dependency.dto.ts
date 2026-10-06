import {
  IsString,
  IsNotEmpty,
  IsArray,
} from 'class-validator';

export class CreateJobDependencyDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  dependsOnJobIds: string[];
}
