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
import type { IJwtPayload } from '@modules/authentication/interfaces';
import { UsersService } from './users.service';
import { UpdateUserDto, UserListResponseDto, UserResponseDto } from './dto';
import type { IUserListResult } from './interfaces';

@ApiTags('Users')
@ApiBearerAuth('access-token')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── GET /users ───────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List users in the current workspace',
    description: "Returns a paginated list of all users belonging to the requester's workspace.",
  })
  @ApiResponse({ status: HttpStatus.OK, type: UserListResponseDto })
  findAll(
    @CurrentUser('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
  ): Promise<IUserListResult> {
    return this.usersService.findAll(workspaceId, pagination);
  }

  // ── GET /users/:id ───────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a user by ID (workspace-scoped)' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found in workspace' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findById(id, workspaceId);
  }

  // ── PATCH /users/:id ─────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update a user',
    description:
      'Users can update their own profile. OWNER / ADMIN can update any user and change role/status.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: UserResponseDto })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found in workspace' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() requester: IJwtPayload,
  ): Promise<UserResponseDto> {
    return this.usersService.update(
      id,
      dto,
      requester.sub,
      requester.role,
      requester.workspaceId,
    );
  }

  // ── DELETE /users/:id ────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Soft-delete a user (OWNER or ADMIN only)',
    description:
      'Soft-deletes a user from the workspace. Cannot delete yourself or (for ADMIN) workspace owners.',
  })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'User deleted' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Insufficient permissions' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'User not found in workspace' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: IJwtPayload,
  ): Promise<void> {
    return this.usersService.remove(
      id,
      requester.sub,
      requester.role,
      requester.workspaceId,
    );
  }
}

