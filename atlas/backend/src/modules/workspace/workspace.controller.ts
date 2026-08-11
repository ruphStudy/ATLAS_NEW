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
import type { AuthResponseDto } from '@modules/authentication/dto';
import { PaginationDto } from '@common/dto/pagination.dto';
import { WorkspaceService } from './workspace.service';
import { WorkspaceMembershipService } from './workspace-membership.service';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceListResponseDto,
  WorkspaceResponseDto,
  SuspendWorkspaceDto,
  InviteMemberDto,
  UpdateMemberRoleDto,
  MemberFilterDto,
  InvitationFilterDto,
  TransferOwnershipDto,
  WorkspaceProfileResponseDto,
  WorkspaceMemberResponseDto,
  PaginatedWorkspaceMemberResponseDto,
  WorkspaceInvitationResponseDto,
  PaginatedWorkspaceInvitationResponseDto,
} from './dto';
import type { IWorkspaceListResult } from './interfaces';

@ApiTags('Workspace')
@ApiBearerAuth('access-token')
@Controller({ path: 'workspaces', version: '1' })
export class WorkspaceController {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly membershipService: WorkspaceMembershipService,
  ) {}

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

  // ── Lifecycle ──────────────────────────────────────────────────

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a suspended/archived workspace (OWNER or ADMIN)' })
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('sub') userId: string): Promise<WorkspaceResponseDto> {
    return this.workspaceService.activate(id, userId);
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a workspace (OWNER or ADMIN)' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendWorkspaceDto,
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceResponseDto> {
    return this.workspaceService.suspend(id, userId, dto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a workspace (OWNER or ADMIN)' })
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('sub') userId: string): Promise<WorkspaceResponseDto> {
    return this.workspaceService.archive(id, userId);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Restore an archived workspace to ACTIVE (OWNER or ADMIN)' })
  restore(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('sub') userId: string): Promise<WorkspaceResponseDto> {
    return this.workspaceService.restore(id, userId);
  }

  @Get(':id/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the extended workspace profile (composed with resolved regional/contact settings)' })
  getProfile(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('sub') userId: string): Promise<WorkspaceProfileResponseDto> {
    return this.workspaceService.getProfile(id, userId);
  }

  @Post(':id/transfer-ownership')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfer workspace ownership to another member (current OWNER only)' })
  transferOwnership(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceResponseDto> {
    return this.membershipService.transferOwnership(id, userId, dto) as unknown as Promise<WorkspaceResponseDto>;
  }

  @Post(':id/switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Switch the current session to a different workspace the caller is a member of' })
  switchWorkspace(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
  ): Promise<AuthResponseDto> {
    return this.membershipService.switchWorkspace(userId, id);
  }

  // ── Members ──────────────────────────────────────────────────────

  @Get(':id/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List workspace members' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedWorkspaceMemberResponseDto })
  listMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Query() filter: MemberFilterDto,
  ): Promise<PaginatedWorkspaceMemberResponseDto> {
    return this.membershipService.listMembers(id, userId, filter) as unknown as Promise<PaginatedWorkspaceMemberResponseDto>;
  }

  @Patch(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Change a member's role (OWNER or ADMIN)" })
  updateMemberRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceMemberResponseDto> {
    return this.membershipService.updateMemberRole(id, memberId, userId, dto) as unknown as Promise<WorkspaceMemberResponseDto>;
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the workspace (OWNER or ADMIN)' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<void> {
    return this.membershipService.removeMember(id, memberId, userId);
  }

  // ── Invitations ──────────────────────────────────────────────────

  @Post(':id/invitations')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a new member by email (OWNER or ADMIN)' })
  @ApiResponse({ status: HttpStatus.CREATED, type: WorkspaceInvitationResponseDto })
  inviteMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InviteMemberDto,
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceInvitationResponseDto> {
    return this.membershipService.inviteMember(id, userId, dto) as unknown as Promise<WorkspaceInvitationResponseDto>;
  }

  @Get(':id/invitations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List invitations (OWNER or ADMIN)' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedWorkspaceInvitationResponseDto })
  listInvitations(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @Query() filter: InvitationFilterDto,
  ): Promise<PaginatedWorkspaceInvitationResponseDto> {
    return this.membershipService.listInvitations(id, userId, filter) as unknown as Promise<PaginatedWorkspaceInvitationResponseDto>;
  }

  @Delete(':id/invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a pending invitation (OWNER or ADMIN)' })
  revokeInvitation(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<void> {
    return this.membershipService.revokeInvitation(id, invitationId, userId);
  }

  @Post('invitations/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a pending invitation by token (authenticated user whose email matches the invite)' })
  acceptInvitation(
    @Query('token') token: string,
    @CurrentUser('sub') userId: string,
  ): Promise<WorkspaceMemberResponseDto> {
    return this.membershipService.acceptInvitation(token, userId) as unknown as Promise<WorkspaceMemberResponseDto>;
  }
}

