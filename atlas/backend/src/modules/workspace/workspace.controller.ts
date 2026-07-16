import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@modules/authentication/decorators';
import { PaginationDto } from '@common/dto/pagination.dto';
import { WorkspaceService } from './workspace.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceListResponseDto,
  WorkspaceResponseDto,
} from './dto';
import type { IWorkspaceListResult } from './interfaces';

@ApiTags('Workspace')
@ApiBearerAuth('access-token')
@Controller({ path: 'workspaces', version: '1' })
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  // ── POST /workspaces ─────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new workspace' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: WorkspaceResponseDto,
    description: 'Workspace created',
  })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation failed' })
  create(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.create(dto, userId);
  }

  // ── GET /workspaces ──────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List workspaces accessible to the current user' })
  @ApiResponse({ status: HttpStatus.OK, type: WorkspaceListResponseDto })
  findAll(
    @CurrentUser('sub') userId: string,
    @Query() pagination: PaginationDto,
  ): Promise<IWorkspaceListResult> {
    return this.workspaceService.findAll(userId, pagination);
  }

  // ── GET /workspaces/:id ──────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a workspace by ID' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: WorkspaceResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Workspace not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Access denied' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.findById(id, userId);
  }

  // ── PATCH /workspaces/:id ────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a workspace (OWNER or ADMIN)' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: WorkspaceResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Workspace not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.update(id, dto, userId);
  }

  // ── DELETE /workspaces/:id ───────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete a workspace (OWNER only)' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Workspace deleted' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Must be OWNER to delete',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Workspace not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<void> {
    return this.workspaceService.remove(id, userId);
  }
}

