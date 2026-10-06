import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiResponseValidationService } from './ai-response-validation.service';
import {
  ValidateResponseDto,
  CreateValidatorConfigDto,
  UpdateValidatorConfigDto,
  ValidationFilterDto,
  ValidationResponseDto,
  PaginatedValidationResponseDto,
  ValidationResultDto,
  ValidatorConfigResponseDto,
} from './dto';

@Controller('ai-response-validation')
export class AiResponseValidationController {
  constructor(
    private readonly validationService: AiResponseValidationService,
  ) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateResponse(
    @Body() dto: ValidateResponseDto,
  ): Promise<ValidationResultDto> {
    return (await this.validationService.validateResponse(
      dto,
    )) as ValidationResultDto;
  }

  @Get('validations')
  async findAllValidations(
    @Query() filter: ValidationFilterDto,
  ): Promise<PaginatedValidationResponseDto> {
    return this.validationService.findAllValidations(filter);
  }

  @Get('validations/:id')
  async findValidationById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<ValidationResponseDto> {
    return (await this.validationService.findValidationById(
      id,
      workspaceId,
    )) as ValidationResponseDto;
  }

  @Get('validations/:id/results')
  async getValidationResults(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.validationService.getValidationResults(id, workspaceId);
  }

  @Get('validations/:id/history')
  async getValidationHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.validationService.getValidationHistory(id, workspaceId);
  }

  @Get('stats')
  async getValidationStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.validationService.getValidationStats(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('validator-configs')
  @HttpCode(HttpStatus.CREATED)
  async createValidatorConfig(
    @Body() dto: CreateValidatorConfigDto,
  ): Promise<ValidatorConfigResponseDto> {
    return (await this.validationService.createValidatorConfig(
      dto,
    )) as ValidatorConfigResponseDto;
  }

  @Patch('validator-configs/:id')
  async updateValidatorConfig(
    @Param('id') id: string,
    @Body() dto: UpdateValidatorConfigDto,
  ): Promise<ValidatorConfigResponseDto> {
    return (await this.validationService.updateValidatorConfig(
      id,
      dto,
    )) as ValidatorConfigResponseDto;
  }

  @Delete('validator-configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteValidatorConfig(@Param('id') id: string): Promise<void> {
    await this.validationService.deleteValidatorConfig(id);
  }

  @Get('validator-configs/:id')
  async findValidatorConfigById(
    @Param('id') id: string,
  ): Promise<ValidatorConfigResponseDto> {
    return (await this.validationService.findValidatorConfigById(
      id,
    )) as ValidatorConfigResponseDto;
  }
}
