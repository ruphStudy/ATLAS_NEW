import { IsString, IsOptional, IsEnum, IsInt, Min, Max, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApprovalRequestStatus } from '../interfaces';
import { APPROVAL_REQUEST_SORT_FIELDS } from '../constants';

export class RequestFilterDto {
  @IsString()
  @IsOptional()
  module?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  definitionId?: string;

  @IsEnum(ApprovalRequestStatus)
  @IsOptional()
  status?: ApprovalRequestStatus;

  @IsString()
  @IsOptional()
  requestedBy?: string;

  /** Only requests where the caller is currently an eligible, pending approver — the "my approvals" view. */
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  assignedToMe?: boolean;

  @IsIn(APPROVAL_REQUEST_SORT_FIELDS)
  @IsOptional()
  sortBy?: (typeof APPROVAL_REQUEST_SORT_FIELDS)[number];

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
