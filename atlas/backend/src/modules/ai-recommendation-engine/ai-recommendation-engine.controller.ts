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
import { AiRecommendationEngineService } from './ai-recommendation-engine.service';
import {
  GenerateRecommendationDto,
  AcceptRecommendationDto,
  RejectRecommendationDto,
  DismissRecommendationDto,
  DeferRecommendationDto,
  SubmitFeedbackDto,
  TrackOutcomeDto,
  RecommendationFilterDto,
  CreateStrategyDto,
  UpdateStrategyDto,
  RecommendationResponseDto,
  PaginatedRecommendationResponseDto,
  RecommendationResultDto,
  StrategyResponseDto,
  FeedbackResponseDto,
  OutcomeResponseDto,
} from './dto';

@Controller('ai-recommendation-engine')
export class AiRecommendationEngineController {
  constructor(
    private readonly recommendationService: AiRecommendationEngineService,
  ) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateRecommendation(
    @Body() dto: GenerateRecommendationDto,
  ): Promise<RecommendationResultDto> {
    return (await this.recommendationService.generateRecommendation(
      dto,
    )) as RecommendationResultDto;
  }

  @Get('recommendations')
  async findAllRecommendations(
    @Query() filter: RecommendationFilterDto,
  ): Promise<PaginatedRecommendationResponseDto> {
    return this.recommendationService.findAllRecommendations(filter);
  }

  @Get('recommendations/:id')
  async findRecommendationById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<RecommendationResponseDto> {
    return (await this.recommendationService.findRecommendationById(
      id,
      workspaceId,
    )) as RecommendationResponseDto;
  }

  @Get('recommendations/:id/items')
  async getItems(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.recommendationService.getItems(id, workspaceId);
  }

  @Get('recommendations/:id/history')
  async getHistory(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.recommendationService.getHistory(id, workspaceId);
  }

  @Get('recommendations/:id/feedback')
  async getFeedback(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.recommendationService.getFeedback(id, workspaceId);
  }

  @Get('recommendations/:id/outcomes')
  async getOutcomes(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ): Promise<any[]> {
    return this.recommendationService.getOutcomes(id, workspaceId);
  }

  @Post('recommendations/:id/accept')
  @HttpCode(HttpStatus.OK)
  async acceptRecommendation(
    @Param('id') id: string,
    @Body() dto: AcceptRecommendationDto,
  ): Promise<RecommendationResponseDto> {
    return (await this.recommendationService.acceptRecommendation(
      id,
      dto,
    )) as RecommendationResponseDto;
  }

  @Post('recommendations/:id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectRecommendation(
    @Param('id') id: string,
    @Body() dto: RejectRecommendationDto,
  ): Promise<RecommendationResponseDto> {
    return (await this.recommendationService.rejectRecommendation(
      id,
      dto,
    )) as RecommendationResponseDto;
  }

  @Post('recommendations/:id/dismiss')
  @HttpCode(HttpStatus.OK)
  async dismissRecommendation(
    @Param('id') id: string,
    @Body() dto: DismissRecommendationDto,
  ): Promise<RecommendationResponseDto> {
    return (await this.recommendationService.dismissRecommendation(
      id,
      dto,
    )) as RecommendationResponseDto;
  }

  @Post('recommendations/:id/defer')
  @HttpCode(HttpStatus.OK)
  async deferRecommendation(
    @Param('id') id: string,
    @Body() dto: DeferRecommendationDto,
  ): Promise<RecommendationResponseDto> {
    return (await this.recommendationService.deferRecommendation(
      id,
      dto,
    )) as RecommendationResponseDto;
  }

  @Post('recommendations/:id/feedback')
  @HttpCode(HttpStatus.CREATED)
  async submitFeedback(
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
  ): Promise<FeedbackResponseDto> {
    return this.recommendationService.submitFeedback(id, dto);
  }

  @Post('recommendations/:id/outcomes')
  @HttpCode(HttpStatus.CREATED)
  async trackOutcome(
    @Param('id') id: string,
    @Body() dto: TrackOutcomeDto,
  ): Promise<OutcomeResponseDto> {
    return this.recommendationService.trackOutcome(id, dto);
  }

  @Get('stats')
  async getRecommendationStats(
    @Query('workspaceId') workspaceId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    return this.recommendationService.getRecommendationStats(
      workspaceId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Post('strategies')
  @HttpCode(HttpStatus.CREATED)
  async createStrategy(
    @Body() dto: CreateStrategyDto,
  ): Promise<StrategyResponseDto> {
    return (await this.recommendationService.createStrategy(
      dto,
    )) as StrategyResponseDto;
  }

  @Patch('strategies/:id')
  async updateStrategy(
    @Param('id') id: string,
    @Body() dto: UpdateStrategyDto,
  ): Promise<StrategyResponseDto> {
    return (await this.recommendationService.updateStrategy(
      id,
      dto,
    )) as StrategyResponseDto;
  }

  @Delete('strategies/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStrategy(@Param('id') id: string): Promise<void> {
    await this.recommendationService.deleteStrategy(id);
  }

  @Get('strategies/:id')
  async findStrategyById(
    @Param('id') id: string,
  ): Promise<StrategyResponseDto> {
    return (await this.recommendationService.findStrategyById(
      id,
    )) as StrategyResponseDto;
  }
}
