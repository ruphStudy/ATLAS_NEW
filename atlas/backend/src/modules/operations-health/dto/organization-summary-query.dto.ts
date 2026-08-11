import { IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class OrganizationSummaryQueryDto {
  /** Comma-separated workspace ids belonging to the organization — this module has no dependency on the Workspace module, so callers supply the membership list. */
  @Transform(({ value }) => (typeof value === 'string' ? value.split(',').map((v) => v.trim()).filter(Boolean) : value))
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  workspaceIds: string[];
}
