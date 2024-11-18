import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot } from 'grammy';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { BaseCommand } from '../base.command';
import {
  COMMAND_METADATA,
  CommandMetadata,
} from 'src/common/decorators/command.decorator';
import { RecordPaymentCommand } from '../record-payment.command';

@Injectable()
export class CommandHandler implements OnModuleInit {
  private commands = new Map<string, BaseCommand>();
  private isInitialized = false;

  constructor(
    @InjectPinoLogger(CommandHandler.name)
    private readonly logger: PinoLogger,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  async onModuleInit() {
    if (!this.isInitialized) {
      await this.discoverCommands();
      this.isInitialized = true;
    }
  }

  private async discoverCommands() {
    if (this.commands.size > 0) {
      return;
    }

    const wrappers = this.discoveryService.getProviders();

    wrappers.forEach((wrapper) => {
      const { instance } = wrapper;

      if (
        instance &&
        Object.getPrototypeOf(instance) &&
        instance instanceof BaseCommand
      ) {
        const metadata = Reflect.getMetadata(
          COMMAND_METADATA,
          instance.constructor,
        ) as CommandMetadata;

        if (metadata?.name) {
          this.logger.debug(`Discovered command: ${metadata.name}`);
          this.commands.set(metadata.name, instance);
        }
      }
    });

    // this.logger.debug(`Total commands discovered: ${this.commands.size}`);
  }

  async registerCommands(bot: Bot) {
    if (!this.isInitialized) {
      await this.discoverCommands();
      this.isInitialized = true;
    }

    if (this.commands.size === 0) {
      this.logger.warn('No commands available for registration');
      return;
    }

    this.logger.debug(`Registering ${this.commands.size} commands`);

    // Register command handlers
    this.commands.forEach((command, name) => {
      this.logger.debug(`Registering command: ${name}`);

      bot.command(name, async (ctx) => {
        try {
          this.logger.debug(`Executing command: ${name}`);
          const text = ctx.message?.text?.trim();
          const metadata = Reflect.getMetadata(
            COMMAND_METADATA,
            command.constructor,
          ) as CommandMetadata;

          if (text === `/${name} help` && metadata.usage) {
            await ctx.reply(metadata.usage);
            return;
          }

          this.logger.debug(`Executing ${name} command handler`);
          await command.execute(ctx);
        } catch (error) {
          this.logger.error(`Error executing command ${name}:`, error);
          await ctx.reply('An error occurred while executing the command.');
        }
      });
    });

    // Register callback query handlers for payment product selection
    bot.on('callback_query:data', async (ctx) => {
      const callbackData = ctx.callbackQuery.data;
      if (callbackData?.startsWith('payment_prod:')) {
        const recordPaymentCommand = this.commands.get(
          'record_payment',
        ) as RecordPaymentCommand;
        if (recordPaymentCommand) {
          await recordPaymentCommand.handleProductSelection(ctx);
        }
      }
    });
    // Register unknown command handler
    bot.on('message:text', async (ctx) => {
      const recordPaymentCommand = this.commands.get(
        'record_payment',
      ) as RecordPaymentCommand;
      if (recordPaymentCommand) {
        await recordPaymentCommand.handlePaymentAmount(ctx);
      }
    });
  }
}
