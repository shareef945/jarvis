import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot } from 'grammy';
import { AppConfig, InjectAppConfig } from '../app.config';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { CommandHandler } from './commands/handler/command.handler';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TELEGRAM_BOT_COMMANDS } from 'src/app.const';
import { FileDownloadDto } from 'src/file-manager/file-download.dto';
import { FileManagerService } from 'src/file-manager/file-manager.service';
import { MTProtoService } from 'src/file-manager/mtproto.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Bot;
  private readonly baseUrl: string;

  constructor(
    @InjectAppConfig() private readonly appConfig: AppConfig,
    @InjectPinoLogger(TelegramService.name) private readonly logger: PinoLogger,
    private readonly commandHandler: CommandHandler,
    private readonly httpService: HttpService,
    private readonly mtProtoService: MTProtoService,
    private readonly fileManagerService: FileManagerService,
  ) {
    this.baseUrl = `https://api.telegram.org/bot${this.appConfig.telegram.botToken}`;
  }

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
      await this.commandHandler.registerCommands(this.bot);
      await this.setupFileHandler();
      this.logger.info('Bot initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize bot:', error);
      await this.sendMessage(
        this.appConfig.app.adminChatId,
        `❌ Bot Initialization Failed\n\nError: ${error.message}\n\nCheck logs for details.`,
        { parseMode: 'Markdown' },
      );
      throw error;
    }
  }

  private async startBot() {
    try {
      this.logger.info('Starting jarvis...');
      await this.bot.api.setMyCommands(TELEGRAM_BOT_COMMANDS);
      await this.bot.start({
        drop_pending_updates: true,
        onStart: (botInfo) => {
          this.logger.info(`Jarvis is online -  @${botInfo.username}`);
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

  private async setupFileHandler() {
    this.bot.on('message:document', async (ctx) => {
      try {
        const document = ctx.message.document;
        const sender = ctx.message.from;

        // Create status message
        const statusMessage = await ctx.reply('📥 Processing file...');

        const fileDto: FileDownloadDto = {
          fileName: document.file_name,
          fileSize: document.file_size,
          mimeType: document.mime_type,
          sender: {
            username: sender.username,
            firstName: sender.first_name,
            lastName: sender.last_name,
          },
        };

        const startTime = Date.now();
        let filePath: string;

        // Use Bot API for all files
        const file = await ctx.api.getFile(document.file_id);
        filePath = await this.fileManagerService.downloadSmallFile(
          file.file_path,
          fileDto,
        );

        const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;

        await ctx.api.editMessageText(
          statusMessage.chat.id,
          statusMessage.message_id,
          `✅ File downloaded successfully!\n\n` +
            `Path: ${filePath}\n` +
            `Time: ${minutes}m ${seconds}s`,
        );
      } catch (error) {
        this.logger.error('Error processing file:', error);
        await ctx.reply('❌ Failed to process file: ' + error.message);
      }
    });
  }
}
