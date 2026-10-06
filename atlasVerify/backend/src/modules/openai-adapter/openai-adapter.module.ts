import { Module } from '@nestjs/common';
import { OpenaiAdapterController } from './openai-adapter.controller';
import { OpenaiAdapterService } from './openai-adapter.service';

@Module({
  controllers: [OpenaiAdapterController],
  providers: [OpenaiAdapterService],
  exports: [OpenaiAdapterService],
})
export class OpenaiAdapterModule {}
