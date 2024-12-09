import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { BaseCommand } from './base.command';
import { Command } from 'src/common/decorators/command.decorator';
import { generateHelpMessage } from 'src/app.const';
import { AppConfig, InjectAppConfig } from 'src/app.config';

@Injectable()
@Command({
  name: 'help',
  description: 'Show available commands',
})
export class HelpCommand extends BaseCommand {
  constructor(@InjectAppConfig() private readonly appConfig: AppConfig) {
    super();
  }

  async execute(ctx: Context): Promise<void> {
    try {
      const userId = ctx.from?.id;
      const userRole = userId ? this.appConfig.app.userRoles[userId] : 'guest';
      await ctx.reply(generateHelpMessage(userRole));
    } catch (error) {
      this.logger.error('Error sending help message:', error);
      await ctx.reply('Sorry, there was an error displaying the help menu.');
    }
  }
}
