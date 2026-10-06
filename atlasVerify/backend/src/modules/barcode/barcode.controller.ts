import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { WorkspaceId } from '@common/decorators';
import { BarcodeService } from './barcode.service';
import {
  GenerateBarcodeDto,
  BulkGenerateBarcodeDto,
  AssignBarcodeDto,
  ScanBarcodeDto,
  PrintLabelDto,
  BulkPrintLabelDto,
  ReplaceBarcodeDto,
  CreateLabelTemplateDto,
  UpdateLabelTemplateDto,
  BarcodeFilterDto,
  LabelTemplateFilterDto,
  BarcodeResponseDto,
  BarcodeListResponseDto,
  ScanResultDto,
  LabelTemplateResponseDto,
  LabelTemplateListResponseDto,
  PrintJobResponseDto,
  BulkPrintJobResponseDto,
} from './dto';

@Controller('barcodes')
export class BarcodeController {
  constructor(private readonly service: BarcodeService) {}

  @Post('generate')
  generate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: GenerateBarcodeDto,
  ): Promise<BarcodeResponseDto> {
    return this.service.generate(workspaceId, dto);
  }

  @Post('generate/bulk')
  bulkGenerate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: BulkGenerateBarcodeDto,
  ): Promise<BarcodeResponseDto[]> {
    return this.service.bulkGenerate(workspaceId, dto);
  }

  @Post('assign')
  assign(
    @WorkspaceId() workspaceId: string,
    @Body() dto: AssignBarcodeDto,
  ): Promise<BarcodeResponseDto> {
    return this.service.assign(workspaceId, dto);
  }

  @Post('scan')
  scan(
    @WorkspaceId() workspaceId: string,
    @Body() dto: ScanBarcodeDto,
  ): Promise<ScanResultDto> {
    return this.service.scan(workspaceId, dto);
  }

  @Post('print')
  print(
    @WorkspaceId() workspaceId: string,
    @Body() dto: PrintLabelDto,
  ): Promise<PrintJobResponseDto> {
    return this.service.print(workspaceId, dto);
  }

  @Post('print/bulk')
  bulkPrint(
    @WorkspaceId() workspaceId: string,
    @Body() dto: BulkPrintLabelDto,
  ): Promise<BulkPrintJobResponseDto> {
    return this.service.bulkPrint(workspaceId, dto);
  }

  @Get()
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query() filter: BarcodeFilterDto,
  ): Promise<BarcodeListResponseDto> {
    return this.service.findAll(workspaceId, filter);
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<BarcodeResponseDto> {
    return this.service.findById(id, workspaceId);
  }

  @Post(':id/replace')
  replace(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: ReplaceBarcodeDto,
  ): Promise<BarcodeResponseDto> {
    return this.service.replace(id, workspaceId, dto);
  }

  @Post(':id/deactivate')
  deactivate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<BarcodeResponseDto> {
    return this.service.deactivate(id, workspaceId);
  }

  @Post('templates')
  createTemplate(
    @WorkspaceId() workspaceId: string,
    @Body() dto: CreateLabelTemplateDto,
  ): Promise<LabelTemplateResponseDto> {
    return this.service.createTemplate(workspaceId, dto);
  }

  @Get('templates')
  findAllTemplates(
    @WorkspaceId() workspaceId: string,
    @Query() filter: LabelTemplateFilterDto,
  ): Promise<LabelTemplateListResponseDto> {
    return this.service.findAllTemplates(workspaceId, filter);
  }

  @Get('templates/:id')
  findTemplateById(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<LabelTemplateResponseDto> {
    return this.service.findTemplateById(id, workspaceId);
  }

  @Patch('templates/:id')
  updateTemplate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
    @Body() dto: UpdateLabelTemplateDto,
  ): Promise<LabelTemplateResponseDto> {
    return this.service.updateTemplate(id, workspaceId, dto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTemplate(
    @Param('id') id: string,
    @WorkspaceId() workspaceId: string,
  ): Promise<void> {
    return this.service.deleteTemplate(id, workspaceId);
  }
}
