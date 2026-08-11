import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { WorkspaceId, UserId, Public } from '@common/decorators';
import { FileManagementService } from './file-management.service';
import {
  UploadFileDto,
  FileFilterDto,
  RenameFileDto,
  MoveFileDto,
  CopyFileDto,
  AddFileVersionDto,
  CreateFolderDto,
  IssueAccessTokenDto,
  BulkFileIdsDto,
  FileResponseDto,
  PaginatedFileResponseDto,
  FileVersionResponseDto,
  FileFolderResponseDto,
  FileAccessTokenResponseDto,
  StorageQuotaResponseDto,
} from './dto';

@Controller({ path: 'file-management', version: '1' })
export class FileManagementController {
  constructor(private readonly fileManagementService: FileManagementService) {}

  // ── Upload / list / quota / folders (static routes first) ────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: UploadFileDto,
  ): Promise<FileResponseDto> {
    return (await this.fileManagementService.upload(workspaceId, userId, dto)) as unknown as FileResponseDto;
  }

  @Get()
  async findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: FileFilterDto,
  ): Promise<PaginatedFileResponseDto> {
    return this.fileManagementService.findAll(workspaceId, filter);
  }

  @Get('quota')
  async getQuota(@WorkspaceId() workspaceId: string): Promise<StorageQuotaResponseDto> {
    return this.fileManagementService.getQuota(workspaceId);
  }

  @Get('folders')
  async listFolders(
    @WorkspaceId() workspaceId: string,
    @Query('parentFolderId') parentFolderId?: string,
  ): Promise<FileFolderResponseDto[]> {
    return (await this.fileManagementService.listFolders(workspaceId, parentFolderId)) as unknown as FileFolderResponseDto[];
  }

  @Post('folders')
  @HttpCode(HttpStatus.CREATED)
  async createFolder(
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CreateFolderDto,
  ): Promise<FileFolderResponseDto> {
    return (await this.fileManagementService.createFolder(workspaceId, userId, dto)) as unknown as FileFolderResponseDto;
  }

  @Delete('folders/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFolder(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<void> {
    await this.fileManagementService.removeFolder(id, workspaceId);
  }

  @Post('bulk/archive')
  async bulkArchive(
    @WorkspaceId() workspaceId: string,
    @Body() dto: BulkFileIdsDto,
  ): Promise<{ count: number }> {
    const count = await this.fileManagementService.bulkArchive(dto.ids, workspaceId);
    return { count };
  }

  @Post('bulk/restore')
  async bulkRestore(
    @WorkspaceId() workspaceId: string,
    @Body() dto: BulkFileIdsDto,
  ): Promise<{ count: number }> {
    const count = await this.fileManagementService.bulkRestore(dto.ids, workspaceId);
    return { count };
  }

  @Post('bulk/delete')
  async bulkDelete(
    @WorkspaceId() workspaceId: string,
    @Body() dto: BulkFileIdsDto,
  ): Promise<{ count: number }> {
    const count = await this.fileManagementService.bulkRemove(dto.ids, workspaceId);
    return { count };
  }

  // ── Public, token-based access (bypasses JwtAuthGuard) ───────────

  @Public()
  @Get('access/:token')
  async accessByToken(@Param('token') token: string, @Res() res: Response): Promise<void> {
    const { buffer, fileName, mimeType } = await this.fileManagementService.consumeAccessToken(token);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  // ── Single-file operations ────────────────────────────────────────

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<FileResponseDto> {
    return (await this.fileManagementService.findById(id, workspaceId)) as unknown as FileResponseDto;
  }

  @Get(':id/download')
  async download(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName, mimeType } = await this.fileManagementService.download(id, workspaceId);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get(':id/preview')
  async preview(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, fileName, mimeType } = await this.fileManagementService.preview(id, workspaceId);
    res.set({
      'Content-Type': mimeType,
      'Content-Disposition': `inline; filename="${encodeURIComponent(fileName)}"`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get(':id/versions')
  async listVersions(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<FileVersionResponseDto[]> {
    return (await this.fileManagementService.listVersions(id, workspaceId)) as unknown as FileVersionResponseDto[];
  }

  @Post(':id/versions')
  @HttpCode(HttpStatus.CREATED)
  async addVersion(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: AddFileVersionDto,
  ): Promise<FileResponseDto> {
    return (await this.fileManagementService.addVersion(id, workspaceId, userId, dto)) as unknown as FileResponseDto;
  }

  @Patch(':id/rename')
  async rename(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: RenameFileDto,
  ): Promise<FileResponseDto> {
    return (await this.fileManagementService.rename(id, workspaceId, dto)) as unknown as FileResponseDto;
  }

  @Patch(':id/move')
  async move(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: MoveFileDto,
  ): Promise<FileResponseDto> {
    return (await this.fileManagementService.move(id, workspaceId, dto)) as unknown as FileResponseDto;
  }

  @Post(':id/copy')
  @HttpCode(HttpStatus.CREATED)
  async copy(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: CopyFileDto,
  ): Promise<FileResponseDto> {
    return (await this.fileManagementService.copy(id, workspaceId, userId, dto)) as unknown as FileResponseDto;
  }

  @Post(':id/archive')
  async archive(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<FileResponseDto> {
    return (await this.fileManagementService.archive(id, workspaceId)) as unknown as FileResponseDto;
  }

  @Post(':id/restore')
  async restore(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<FileResponseDto> {
    return (await this.fileManagementService.restore(id, workspaceId)) as unknown as FileResponseDto;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @WorkspaceId() workspaceId: string): Promise<void> {
    await this.fileManagementService.remove(id, workspaceId);
  }

  @Post(':id/access-tokens')
  @HttpCode(HttpStatus.CREATED)
  async issueAccessToken(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @UserId() userId: string,
    @Body() dto: IssueAccessTokenDto,
  ): Promise<FileAccessTokenResponseDto> {
    return (await this.fileManagementService.issueAccessToken(
      id,
      workspaceId,
      userId,
      dto,
    )) as unknown as FileAccessTokenResponseDto;
  }
}
