import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot } from 'grammy';
import { AppConfig, InjectAppConfig } from '../app.config';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { CommandHandler } from './commands/handler/command.handler';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Bot;

  constructor(
    @InjectAppConfig() private readonly appConfig: AppConfig,
    @InjectPinoLogger(TelegramService.name) private readonly logger: PinoLogger,
    private readonly commandHandler: CommandHandler,
  ) {}

  async onModuleInit() {
    await this.initializeBot();
    await this.startBot();
  }

  private async initializeBot() {
    try {
      if (!this.appConfig.telegram.botToken) {
        throw new Error('Bot token is not configured');
      }

      this.bot = new Bot(this.appConfig.telegram.botToken);

      // Wait for commands to be discovered
      await this.commandHandler.onModuleInit();

      // Register commands
      this.commandHandler.registerCommands(this.bot);

      this.logger.info('Bot initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize bot:', error);
      throw error;
    }
  }

  private async startBot() {
    try {
      this.logger.info('Starting bot...');

      await this.bot.api.setMyCommands([
        { command: 'start', description: 'Start interacting with JARVIS' },
        { command: 'help', description: 'Show available commands' },
        { command: 'addrow', description: 'Add a new row to a spreadsheet' },
      ]);

      await this.bot.start({
        drop_pending_updates: true,
        onStart: (botInfo) => {
          this.logger.info(`Bot @${botInfo.username} started successfully`);
        },
      });
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      throw error;
    }
  }
}
