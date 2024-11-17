import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GoogleSheetsService } from '../../google-sheets/google-sheets.service';
import { Command } from 'src/common/decorators/command.decorator';
import { BaseCommand } from './base.command';

@Injectable()
@Command({
  name: 'addrow',
  description: 'Add a new row to a spreadsheet',
  usage:
    'Usage: /addrow <spreadsheet_id> <worksheet_name> <value1, value2, ...>',
})
export class SheetsAddRowCommand extends BaseCommand {
  constructor(
    @InjectPinoLogger(SheetsAddRowCommand.name)
    protected readonly logger: PinoLogger,
    private readonly sheetsService: GoogleSheetsService,
  ) {
    super(logger);
  }

  async execute(ctx: Context): Promise<void> {
    // Your command logic here
  }
}
