import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsArray,
} from 'class-validator';
import { IDashboardLayout } from '../interfaces';

export class CreateDashboardTemplateDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsString()
  templateKey: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsObject()
  layout: IDashboardLayout;

  @IsArray()
  defaultWidgets: any[];

  @IsOptional()
  @IsBoolean()
  isGlobal?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateDashboardTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsObject()
  layout?: IDashboardLayout;

  @IsOptional()
  @IsArray()
  defaultWidgets?: any[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class DashboardTemplateResponseDto {
  id: string;
  workspaceId?: string;
  templateKey: string;
  name: string;
  description?: string;
  category?: string;
  layout: IDashboardLayout;
  defaultWidgets: any[];
  isGlobal: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}
