import { Injectable, Logger } from '@nestjs/common';
import { Context } from 'grammy';
import { TelegramCommand } from 'src/app.types';

@Injectable()
export class CommandRegistryService {
  private commands = new Map<string, TelegramCommand>();
  private callbackHandlers = new Map<string, TelegramCommand>();
  private messageHandlers = new Set<TelegramCommand>();
  private readonly logger = new Logger(CommandRegistryService.name);

  registerCommand(command: TelegramCommand) {
    // Check for existing command
    if (this.commands.has(command.name)) {
      this.logger.warn(
        `Command ${command.name} is already registered. Skipping.`,
      );
      return;
    }

    this.commands.set(command.name, command);

    // Register callback handlers if they exist
    if (command.handleCallback) {
      // Register the default command callback pattern
      this.callbackHandlers.set(`${command.name}_callback:`, command);

      // Register additional callback patterns if defined
      if (command.callbackPatterns) {
        command.callbackPatterns.forEach((pattern) => {
          this.callbackHandlers.set(pattern, command);
        });
      }
    }

    // Register message handlers if they exist
    if (command.handleMessage) {
      this.messageHandlers.add(command);
    }
  }

  async handleCallback(ctx: Context) {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    try {
      // Try to find a command that can handle this callback
      for (const [pattern, command] of this.callbackHandlers.entries()) {
        if (callbackData.startsWith(pattern)) {
          await command.handleCallback(ctx);
          return;
        }
      }
    } catch (error) {
      this.logger.error(
        `Error handling callback: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
  async handleMessage(ctx: Context) {
    try {
      for (const command of this.messageHandlers) {
        // this.logger.debug(`Executing message handler for: ${command.name}`);
        await command.handleMessage(ctx);
      }
    } catch (error) {
      this.logger.error(
        `Error handling message: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  getRegisteredCommands(): TelegramCommand[] {
    return Array.from(this.commands.values());
  }

  getCommandCount(): number {
    return this.commands.size;
  }

  getHandlerCounts(): {
    commands: number;
    callbacks: number;
    messages: number;
  } {
    return {
      commands: this.commands.size,
      callbacks: this.callbackHandlers.size,
      messages: this.messageHandlers.size,
    };
  }
}
