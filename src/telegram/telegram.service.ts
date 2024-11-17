import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot } from 'grammy';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Bot;

  constructor(private configService: ConfigService) {
    this.bot = new Bot(this.configService.get('BOT_TOKEN'));
  }

  async onModuleInit() {
    // Register command handlers
    this.bot.command('start', async (ctx) => {
      await ctx.reply("Welcome to SAI Technology's RPA service!");
    });

    this.bot.command('help', async (ctx) => {
      await ctx.reply('Here are the available commands...');
    });

    // Start the bot
    await this.bot.start();
  }
}
