import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { HelpCommand } from './commands/help.command';
import { DiscoveryModule } from '@nestjs/core';
import { CommandHandler } from './commands/handler/command.handler';
import { SheetsAddRowCommand } from './commands/sheets-addrow.command';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { RecordPaymentCommand } from './commands/record-payment.command';
import { HttpModule } from '@nestjs/axios';
import { FileCommand } from './commands/file.command';
import { FileManagerModule } from 'src/file-manager/file-manager.module';
import { RolesGuard } from 'src/common/guards/role.guard';

@Module({
  imports: [DiscoveryModule, GoogleSheetsModule, HttpModule, FileManagerModule],
  providers: [
    TelegramService,
    CommandHandler,
    HelpCommand,
    SheetsAddRowCommand,
    RecordPaymentCommand,
    FileCommand,
    RolesGuard,
  ],
  exports: [TelegramService],
})
export class TelegramModule {}
