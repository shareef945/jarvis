import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { BaseCommand } from './base.command';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Command } from 'src/common/decorators/command.decorator';

@Injectable()
@Command({
  name: 'start',
  description: 'Start interacting with JARVIS',
})
export class StartCommand extends BaseCommand {
  constructor(
    @InjectPinoLogger(StartCommand.name)
    protected readonly logger: PinoLogger,
  ) {
    super(logger);
  }

  async execute(ctx: Context): Promise<void> {
    const message = `
👋 Hello! I am JARVIS, your personal assistant.

I can help you with:
- Managing Google Sheets
- File management
- And more!

Use /help to see all available commands.
    `;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
}