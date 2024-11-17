import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { BaseCommand } from './base.command';
import { Command } from 'src/common/decorators/command.decorator';

@Injectable()
@Command({
  name: 'help',
  description: 'Show available commands',
})
export class HelpCommand extends BaseCommand {
  constructor(
    @InjectPinoLogger(HelpCommand.name)
    protected readonly logger: PinoLogger,
  ) {
    super(logger);
  }

  async execute(ctx: Context): Promise<void> {
    const helpMessage = `
🤖 *JARVIS Help Menu*

Available Commands:
/help - Show this help message
/sheets - List available spreadsheets
/addrow - Add a new row to a sheet

For detailed usage of any command, type:
<command> help (e.g., /addrow help)
    `;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  }
}
