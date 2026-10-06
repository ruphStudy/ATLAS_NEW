import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ProfitCalculatorController } from './profit-calculator.controller';
import { ProfitCalculatorService } from './profit-calculator.service';
import { ProfitCalculatorRepository } from './profit-calculator.repository';
import { ProfitCalculatorQueue, ProfitCalculatorWorker } from './jobs';
import { AmazonFbaProvider, AmazonFbmProvider } from './providers';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfitCalculatorController],
  providers: [
    ProfitCalculatorService,
    ProfitCalculatorRepository,
    ProfitCalculatorQueue,
    ProfitCalculatorWorker,
    AmazonFbaProvider,
    AmazonFbmProvider,
  ],
  exports: [ProfitCalculatorService],
})
export class ProfitCalculatorModule {}
