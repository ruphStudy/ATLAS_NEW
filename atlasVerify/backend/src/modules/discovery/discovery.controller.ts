import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
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
import { DiscoveryService } from './discovery.service';
import {
  CreateDiscoverySessionDto,
  DiscoveryFilterDto,
  DiscoverySessionListResponseDto,
  DiscoverySessionResponseDto,
  DiscoveryStatsDto,
} from './dto';
import type { IDiscoveryResult, IDiscoverySessionListResult, IDiscoveryStats } from './interfaces';

@ApiTags('Discovery')
@ApiBearerAuth('access-token')
@Controller({ path: 'discovery', version: '1' })
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  // ── POST /discovery/sessions ──────────────────────────────────

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start a new discovery session',
    description:
      'Creates a discovery session and enqueues an async job to discover products across the specified marketplace and keywords. Returns immediately — monitor progress via GET /discovery/sessions/:id.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: DiscoverySessionResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Unsupported marketplace or validation failed',
  })
  createSession(
    @Body() dto: CreateDiscoverySessionDto,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<DiscoverySessionResponseDto> {
    return this.discoveryService.createSession(dto, workspaceId);
  }

  // ── GET /discovery/sessions ───────────────────────────────────

  @Get('sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List discovery sessions for the current workspace' })
  @ApiResponse({ status: HttpStatus.OK, type: DiscoverySessionListResponseDto })
  findAllSessions(
    @CurrentUser('workspaceId') workspaceId: string,
    @Query() filter: DiscoveryFilterDto,
  ): Promise<IDiscoverySessionListResult> {
    return this.discoveryService.findAll(workspaceId, filter);
  }

  // ── GET /discovery/sessions/:id ───────────────────────────────

  @Get('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get discovery session details' })
  @ApiParam({ name: 'id', description: 'Discovery session UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: DiscoverySessionResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Session not found' })
  findSessionById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<DiscoverySessionResponseDto> {
    return this.discoveryService.findById(id, workspaceId);
  }

  // ── GET /discovery/sessions/:id/results ───────────────────────

  @Get('sessions/:id/results')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all results for a discovery session',
    description:
      'Returns every discovered product (both new and duplicate) for the specified session.',
  })
  @ApiParam({ name: 'id', description: 'Discovery session UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Array of discovery results' })
  findSessionResults(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<IDiscoveryResult[]> {
    return this.discoveryService.findResults(id, workspaceId);
  }

  // ── POST /discovery/sessions/:id/cancel ───────────────────────

  @Post('sessions/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel a running or pending discovery session',
    description:
      'Marks the session as CANCELLED. The worker will stop processing at the next iteration.',
  })
  @ApiParam({ name: 'id', description: 'Discovery session UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: DiscoverySessionResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Session cannot be cancelled' })
  cancelSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<DiscoverySessionResponseDto> {
    return this.discoveryService.cancelSession(id, workspaceId);
  }

  // ── GET /discovery/stats ──────────────────────────────────────

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get discovery statistics for the current workspace' })
  @ApiResponse({ status: HttpStatus.OK, type: DiscoveryStatsDto })
  getStats(
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<IDiscoveryStats> {
    return this.discoveryService.getStats(workspaceId);
  }

  // ── GET /discovery/marketplaces ───────────────────────────────

  @Get('marketplaces')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List all supported marketplace codes' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Array of supported marketplace codes',
    schema: { type: 'array', items: { type: 'string' }, example: ['AMAZON'] },
  })
  getSupportedMarketplaces(): string[] {
    return this.discoveryService.getSupportedMarketplaces();
  }
}
