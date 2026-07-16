import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
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
import { SupplierVerificationService } from './supplier-verification.service';
import {
  ConfigureRulesDto,
  ManualOverrideDto,
  StartVerificationDto,
  VerificationFilterDto,
  VerificationListResponseDto,
  VerificationResponseDto,
  VerificationWithChecksResponseDto,
} from './dto';
import type { IVerificationListResult, IVerificationRules } from './interfaces';
import type { IJwtPayload } from '@modules/authentication/interfaces';

@ApiTags('Supplier Verification')
@ApiBearerAuth('access-token')
@Controller({ path: 'supplier-verification', version: '1' })
export class SupplierVerificationController {
  constructor(private readonly service: SupplierVerificationService) {}

  // ── POST /supplier-verification/:supplierId ───────────────────

  @Post(':supplierId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Start verification for a supplier',
    description:
      'Creates a verification record and enqueues async checks. Prevents duplicate in-flight verifications.',
  })
  @ApiParam({ name: 'supplierId', description: 'Supplier UUID' })
  @ApiResponse({ status: HttpStatus.CREATED, type: VerificationResponseDto })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Verification already in progress' })
  startVerification(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @Body() dto: StartVerificationDto,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<VerificationResponseDto> {
    return this.service.startVerification(supplierId, workspaceId, dto);
  }

  // ── GET /supplier-verification ────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List verifications with filtering' })
  @ApiResponse({ status: HttpStatus.OK, type: VerificationListResponseDto })
  findAll(
    @CurrentUser('workspaceId') workspaceId: string,
    @Query() filter: VerificationFilterDto,
  ): Promise<IVerificationListResult> {
    return this.service.findAll(workspaceId, filter);
  }

  // ── GET /supplier-verification/:id ───────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a verification with all check results' })
  @ApiParam({ name: 'id', description: 'Verification UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: VerificationWithChecksResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Verification not found' })
  findById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<VerificationWithChecksResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  // ── GET /supplier-verification/supplier/:supplierId/latest ────

  @Get('supplier/:supplierId/latest')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get the most recent verification for a supplier" })
  @ApiParam({ name: 'supplierId', description: 'Supplier UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: VerificationWithChecksResponseDto })
  findLatestForSupplier(
    @Param('supplierId', ParseUUIDPipe) supplierId: string,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<VerificationWithChecksResponseDto> {
    return this.service.findLatestForSupplier(supplierId, workspaceId);
  }

  // ── POST /supplier-verification/:id/override ─────────────────

  @Post(':id/override')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually override verification status',
    description:
      'Allows a manager to override the computed status. All check results are marked MANUAL_OVERRIDE.',
  })
  @ApiParam({ name: 'id', description: 'Verification UUID' })
  @ApiResponse({ status: HttpStatus.OK, type: VerificationWithChecksResponseDto })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Verification not found' })
  manualOverride(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ManualOverrideDto,
    @CurrentUser() requester: IJwtPayload,
  ): Promise<VerificationWithChecksResponseDto> {
    return this.service.manualOverride(id, requester.workspaceId, dto, requester.sub);
  }

  // ── GET /supplier-verification/rules ─────────────────────────

  @Get('rules/current')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current workspace verification rules' })
  getRules(@CurrentUser('workspaceId') workspaceId: string): Promise<IVerificationRules> {
    return this.service.getRules(workspaceId);
  }

  // ── PUT /supplier-verification/rules ─────────────────────────

  @Put('rules')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Configure workspace verification rules',
    description:
      'Sets per-check weights, enabled flags, and required flags. Unspecified checks retain current values.',
  })
  @ApiResponse({ status: HttpStatus.OK })
  configureRules(
    @Body() dto: ConfigureRulesDto,
    @CurrentUser('workspaceId') workspaceId: string,
  ): Promise<IVerificationRules> {
    return this.service.configureRules(workspaceId, dto);
  }
}
