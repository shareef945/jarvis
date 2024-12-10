import { Controller, Get } from '@nestjs/common';
import { TelegramService } from './telegram.service';

@Controller('telegram')
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @Get('status')
  async getStatus() {
    const botInfo = await this.telegramService.getBotInfo();
    return {
      status: 'ok',
      botInfo: botInfo || 'Bot not initialized',
    };
  }
}
