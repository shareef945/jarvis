import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Bot } from 'grammy';
import { AppConfig, InjectAppConfig } from '../app.config';
import { CommandHandler } from './commands/handler/command.handler';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TELEGRAM_BOT_COMMANDS } from 'src/app.const';
@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Bot;
  private readonly baseUrl: string;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    @InjectAppConfig() private readonly appConfig: AppConfig,
    private readonly commandHandler: CommandHandler,
    private readonly httpService: HttpService,
  ) {
    this.baseUrl = `https://api.telegram.org/bot${this.appConfig.telegram.botToken}`;
  }

  async onModuleInit() {
    try {
      this.logger.log('Initializing Telegram service...');
      await this.initializeBot();

      // Set up error handling for the bot
      this.setupErrorHandling();

      await this.startBot().catch((err) => {
        this.logger.error('Failed to start bot:', err);
        // Continue without throwing
      });

      this.logger.log('Telegram service initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Telegram service:', error);
      this.logger.warn(
        'Telegram service will continue in limited functionality mode',
      );
    }
  }

  private setupErrorHandling() {
    if (!this.bot) {
      this.logger.warn('Bot instance is not initialized for error handling');
      return;
    }

    this.bot.catch((err) => {
      this.logger.error('Telegram bot error:', err);
    });

    // Handle API errors
    this.bot.api.config.use((prev, method, payload) => {
      return prev(method, payload).catch((error) => {
        this.logger.error(`API error in method ${method}:`, error);
        throw error;
      });
    });
  }

  private async initializeBot() {
    try {
      if (!this.appConfig.telegram.botToken) {
        throw new Error('Bot token is not configured');
      }

      this.bot = new Bot(this.appConfig.telegram.botToken);

      // Test the connection before proceeding
      const botInfo = await this.bot.api.getMe().catch((err) => {
        throw new Error(`Failed to connect to Telegram: ${err.message}`);
      });

      this.logger.log(`Bot connection test successful: @${botInfo.username}`);

      // Register commands first
      await this.commandHandler.registerCommands(this.bot);

      this.logger.log('Bot initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize bot:', error);
      throw error;
    }
  }

  private async startBot() {
    try {
      this.logger.log('Starting jarvis...');

      // Set commands first
      await this.bot.api.setMyCommands(TELEGRAM_BOT_COMMANDS).catch((err) => {
        this.logger.warn('Failed to set commands, continuing anyway:', err);
      });

      // Start the bot with specific update types
      await this.bot.start({
        drop_pending_updates: true,
        allowed_updates: ['message', 'callback_query'],
        onStart: (botInfo) => {
          this.logger.log(`Jarvis is online - @${botInfo.username}`);
        },
      });
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      throw error;
    }
  }

  async sendMessage(
    chatId: number | string,
    text: string,
    options: {
      parseMode?: 'Markdown' | 'HTML';
      silent?: boolean;
    } = {},
  ): Promise<void> {
    try {
      const url = `${this.baseUrl}/sendMessage`;
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: options.parseMode,
        disable_notification: options.silent,
      };

      await firstValueFrom(this.httpService.post(url, payload));
      this.logger.debug('Message sent successfully', { chatId });
    } catch (error) {
      this.logger.error('Failed to send telegram message:', {
        error: error.response?.data || error.message,
        chatId,
        text,
      });
      throw error;
    }
  }
}
