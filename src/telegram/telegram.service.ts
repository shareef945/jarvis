import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { AppConfig, InjectAppConfig } from '../app.config';

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Bot;

  constructor(@InjectAppConfig() private readonly appConfig: AppConfig) {
    this.initializeBot();
  }

  private initializeBot() {
    this.bot = new Bot(this.appConfig.telegram.botToken);
    this.setupHandlers();
  }

  private setupHandlers() {
    this.bot.command('help', this.handleHelp.bind(this));
    this.bot.command('list_workbooks', this.handleListWorkbooks.bind(this));
    // Add other command handlers
  }

  async onModuleInit() {
    await this.startBot();
  }

  private async startBot() {
    try {
      await this.bot.start();
      this.logger.log('Bot started successfully');
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  private async handleHelp(ctx: Context) {
    const userId = ctx.from?.id;
    const userRole = 'guest'; // You might want to implement role logic here

    await ctx.reply(
      `Welcome to SAI Technology's RPA service!\n\n` +
        `Your user ID: ${userId}\n` +
        `Your role: ${userRole}\n\n` +
        `Available commands:\n` +
        this.getCommandsList(userRole),
    );
  }

  private getCommandsList(userRole: string): string {
    // Implement command list logic based on user role
    return '/help - Show this help message\n/list_workbooks - List available workbooks';
  }

  private async handleListWorkbooks(ctx: Context) {
    // Implement workbook listing logic
    await ctx.reply('Workbook listing functionality coming soon...');
  }
}
