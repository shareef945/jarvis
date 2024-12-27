import { Logger, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { HelpCommand } from './commands/help.command';
import { DiscoveryModule } from '@nestjs/core';
import { CommandHandler } from './commands/handler/command.handler';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { RecordPaymentCommand } from './commands/record-payment.command';
import { HttpModule } from '@nestjs/axios';
import { RolesGuard } from 'src/common/guards/role.guard';
import { RecordMaintenanceCostCommand } from './commands/record-maintenance-cost.command';
import { RecordCapexCommand } from './commands/record-capex.command';
import { MobileMoneyCommand } from './commands/mobile-money.command';
import { MobileMoneyModule } from 'src/mobile-money/mobile-money.module';
import { CommandRegistryService } from './command-registry.service';
import { TelegramController } from './telegram.controller';
import { LlmModule } from 'src/llm/llm.module';

@Module({
  imports: [
    DiscoveryModule,
    GoogleSheetsModule,
    HttpModule,
    MobileMoneyModule,
    LlmModule,
  ],
  providers: [
    Logger,
    TelegramService,
    CommandRegistryService,
    CommandHandler,
    RolesGuard,
    HelpCommand,
    RecordPaymentCommand,
    RecordMaintenanceCostCommand,
    RecordCapexCommand,
    MobileMoneyCommand,
  ],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
