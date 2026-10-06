import { Module } from '@nestjs/common';
import { GeminiAdapterController } from './gemini-adapter.controller';
import { GeminiAdapterService } from './gemini-adapter.service';

@Module({
  controllers: [GeminiAdapterController],
  providers: [GeminiAdapterService],
  exports: [GeminiAdapterService],
})
export class GeminiAdapterModule {}
