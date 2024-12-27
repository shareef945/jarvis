import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MobileMoneyModule } from '../mobile-money/mobile-money.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { AiAssistantService } from './ai-assistant.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    MobileMoneyModule,
    GoogleSheetsModule,
  ],
  providers: [AiAssistantService],
  exports: [AiAssistantService],
})
export class LlmModule {}
