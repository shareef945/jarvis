import { Injectable } from '@nestjs/common';
import { Context } from 'grammy';
import { TelegramCommand } from 'src/app.types';

@Injectable()
export class CommandRegistryService {
  private commands = new Map<string, TelegramCommand>();
  private callbackHandlers = new Map<string, TelegramCommand>();
  private messageHandlers = new Set<TelegramCommand>();

  registerCommand(command: TelegramCommand) {
    this.commands.set(command.name, command);

    // Register callback handlers if they exist
    if (command.handleCallback) {
      this.callbackHandlers.set(`${command.name}_callback:`, command);
    }

    // Register message handlers if they exist
    if (command.handleMessage) {
      this.messageHandlers.add(command);
    }
  }

  async handleCallback(ctx: Context) {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    for (const [prefix, command] of this.callbackHandlers) {
      if (callbackData.startsWith(prefix)) {
        await command.handleCallback(ctx);
        return;
      }
    }
  }

  async handleMessage(ctx: Context) {
    for (const command of this.messageHandlers) {
      await command.handleMessage(ctx);
    }
  }
}
