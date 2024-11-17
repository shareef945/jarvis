import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { HelpCommand } from './commands/help.command';
import { DiscoveryModule } from '@nestjs/core';
import { CommandHandler } from './commands/handler/command.handler';
import { SheetsAddRowCommand } from './commands/sheets-addrow.command';
import { GoogleSheetsModule } from '../google-sheets/google-sheets.module';
import { StartCommand } from './commands/start.command';

@Module({
  imports: [DiscoveryModule, GoogleSheetsModule],
  providers: [
    TelegramService,
    CommandHandler,
    HelpCommand,
    SheetsAddRowCommand,
    StartCommand,
  ],
})
export class TelegramModule {}
