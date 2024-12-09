import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { LlmService } from './llm.service';
import { ActionRegistryService } from './action-registry.service';
import { ActionRegistrationService } from './action-registration.service';
import { MobileMoneyModule } from '../mobile-money/mobile-money.module';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    MobileMoneyModule,
    GoogleSheetsModule,
  ],
  providers: [LlmService, ActionRegistryService, ActionRegistrationService],
  exports: [LlmService],
})
export class LlmModule {}
