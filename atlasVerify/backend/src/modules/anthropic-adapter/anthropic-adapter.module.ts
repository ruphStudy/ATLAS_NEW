import { Module } from '@nestjs/common';
import { AnthropicAdapterController } from './anthropic-adapter.controller';
import { AnthropicAdapterService } from './anthropic-adapter.service';

@Module({
  controllers: [AnthropicAdapterController],
  providers: [AnthropicAdapterService],
  exports: [AnthropicAdapterService],
})
export class AnthropicAdapterModule {}
