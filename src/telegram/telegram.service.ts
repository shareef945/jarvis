import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { AppConfig, InjectAppConfig } from '../app.config';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Bot;

  constructor(
    @InjectAppConfig() private readonly appConfig: AppConfig,
    @InjectPinoLogger(TelegramService.name) private readonly logger: PinoLogger,
  ) {
    this.logger.info('Initializing TelegramService...');
    this.initializeBot();
  }

  private initializeBot() {
    try {
      this.logger.info('Initializing bot instance...');
      if (!this.appConfig.telegram.botToken) {
        throw new Error('Bot token is not configured');
      }

      this.bot = new Bot(this.appConfig.telegram.botToken);
      this.logger.info('Bot instance created successfully');

      // Add some basic error handlers
      this.bot.catch((err) => {
        this.logger.error('Bot encountered an error:', err);
      });
    } catch (error) {
      this.logger.error('Failed to initialize bot:', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      throw error;
    }
  }

  async onModuleInit() {
    await this.startBot();
  }

  private async startBot() {
    try {
      this.logger.info('Attempting to start bot...');
      this.logger.info(
        `Bot token length: ${this.appConfig.telegram.botToken?.length || 0}`,
      );

      if (!this.bot) {
        throw new Error('Bot instance not initialized');
      }

      await this.bot.start({
        onStart: (botInfo) => {
          this.logger.info(`Bot connected as @${botInfo.username}`);
        },
      });

      this.logger.info('Bot started successfully');
    } catch (error) {
      this.logger.error('Failed to start bot. Error details:', {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      throw error;
    }
  }
}
