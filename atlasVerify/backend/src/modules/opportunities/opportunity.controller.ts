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
import { OpportunityService } from './opportunity.service';
import {
  CreateOpportunityDto,
  OpportunityFilterDto,
  OpportunityListResponseDto,
  OpportunityResponseDto,
  UpdateOpportunityDto,
} from './dto';
import type { IOpportunityListResult } from './interfaces';

@ApiTags('Opportunities')
@ApiBearerAuth('access-token')
@Controller({ path: 'opportunities', version: '1' })
export class OpportunityController {
  constructor(private readonly opportunityService: OpportunityService) {}

  // ── POST /opportunities ──────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new opportunity' })
  @ApiResponse({ status: HttpStatus.CREATED, type: OpportunityResponseDto })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Validation failed' })
  create(
    @Body() dto: CreateOpportunityDto,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.create(dto, workspaceId);
  }

  // ── GET /opportunities ───────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List opportunities for the current workspace' })
  @ApiResponse({ status: HttpStatus.OK, type: OpportunityListResponseDto })
  findAll(
    @CurrentUser('workspaceId') workspaceId: string,
    @Query() filter: OpportunityFilterDto,
  ): Promise<IOpportunityListResult> {
    return this.opportunityService.findAll(workspaceId, filter);
  }

  // ── GET /opportunities/:id ───────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get an opportunity by ID' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: OpportunityResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Opportunity not found' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.findById(id, workspaceId);
  }

  // ── PATCH /opportunities/:id ─────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: OpportunityResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Opportunity not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOpportunityDto,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<OpportunityResponseDto> {
    return this.opportunityService.update(id, dto, workspaceId);
  }

  // ── DELETE /opportunities/:id ────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete an opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Opportunity deleted' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Opportunity not found' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<void> {
    return this.opportunityService.remove(id, workspaceId);
  }
}
