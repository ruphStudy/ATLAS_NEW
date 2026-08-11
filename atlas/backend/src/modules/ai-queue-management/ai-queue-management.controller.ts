import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AiQueueManagementService } from './ai-queue-management.service';
import {
  CreateAiQueueDto,
  UpdateAiQueueDto,
  QueueFilterDto,
  EnqueueJobDto,
  EnqueueBatchDto,
  QueueJobFilterDto,
} from './dto';

@Controller('ai-queue-management')
export class AiQueueManagementController {
  constructor(private readonly service: AiQueueManagementService) {}

  @Post('queues')
  @HttpCode(HttpStatus.CREATED)
  async createQueue(@Body() dto: CreateAiQueueDto) {
    return this.service.createQueue(dto);
  }

  @Get('queues')
  async findAllQueues(@Query() filter: QueueFilterDto) {
    return this.service.findAllQueues(filter);
  }

  @Get('queues/:id')
  async findQueueById(@Param('id') id: string) {
    return this.service.findQueueById(id);
  }

  @Get('queues/name/:name')
  async findQueueByName(@Param('name') name: string) {
    return this.service.findQueueByName(name);
  }

  @Patch('queues/:id')
  @HttpCode(HttpStatus.OK)
  async updateQueue(
    @Param('id') id: string,
    @Body() dto: UpdateAiQueueDto,
  ) {
    return this.service.updateQueue(id, dto);
  }

  @Delete('queues/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQueue(@Param('id') id: string) {
    await this.service.deleteQueue(id);
  }

  @Patch('queues/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseQueue(@Param('id') id: string) {
    return this.service.pauseQueue(id);
  }

  @Patch('queues/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeQueue(@Param('id') id: string) {
    return this.service.resumeQueue(id);
  }

  @Patch('queues/:id/drain')
  @HttpCode(HttpStatus.OK)
  async drainQueue(@Param('id') id: string) {
    return this.service.drainQueue(id);
  }

  @Patch('queues/:id/stop')
  @HttpCode(HttpStatus.OK)
  async stopQueue(@Param('id') id: string) {
    return this.service.stopQueue(id);
  }

  @Post('enqueue')
  @HttpCode(HttpStatus.CREATED)
  async enqueueJob(@Body() dto: EnqueueJobDto) {
    return this.service.enqueueJob(dto);
  }

  @Post('enqueue-batch')
  @HttpCode(HttpStatus.CREATED)
  async enqueueBatch(@Body() dto: EnqueueBatchDto) {
    return this.service.enqueueBatch(dto);
  }

  @Get('jobs')
  async findAllJobs(@Query() filter: QueueJobFilterDto) {
    return this.service.findAllJobs(filter);
  }

  @Get('jobs/:id')
  async findJobById(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.findJobById(id, workspaceId);
  }

  @Post('jobs/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelJob(
    @Param('id') id: string,
    @Query('workspaceId') workspaceId: string,
  ) {
    return this.service.cancelJob(id, workspaceId);
  }

  @Get('queues/:id/stats')
  async getQueueStats(@Param('id') id: string) {
    return this.service.getQueueStats(id);
  }
}
