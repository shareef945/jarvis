import { Logger, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { HelpCommand } from './commands/help.command';
import { DiscoveryModule } from '@nestjs/core';
import { CommandHandler } from './commands/handler/command.handler';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { RecordPaymentCommand } from './commands/record-payment.command';
import { HttpModule } from '@nestjs/axios';
import { FileCommand } from './commands/file.command';
import { FileManagerModule } from 'src/file-manager/file-manager.module';
import { RolesGuard } from 'src/common/guards/role.guard';
import { RecordMaintenanceCostCommand } from './commands/record-maintenance-cost.command';
import { RecordCapexCommand } from './commands/record-capex.command';
import { MobileMoneyCommand } from './commands/mobile-money.command';
import { MobileMoneyModule } from 'src/mobile-money/mobile-money.module';
import { CommandRegistryService } from './command-registry.service';
import { TelegramController } from './telegram.controller';

@Module({
  imports: [
    DiscoveryModule,
    GoogleSheetsModule,
    HttpModule,
    FileManagerModule,
    MobileMoneyModule,
  ],
  providers: [
    Logger,
    TelegramService,
    CommandRegistryService,
    CommandHandler,
    RolesGuard,
    HelpCommand,
    RecordPaymentCommand,
    // FileCommand,
    RecordMaintenanceCostCommand,
    RecordCapexCommand,
    MobileMoneyCommand,
  ],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
