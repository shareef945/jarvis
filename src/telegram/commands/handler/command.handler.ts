import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot } from 'grammy';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DiscoveryService, MetadataScanner } from '@nestjs/core';
import { BaseCommand } from '../base.command';
import {
  COMMAND_METADATA,
  CommandMetadata,
} from 'src/common/decorators/command.decorator';

@Injectable()
export class CommandHandler implements OnModuleInit {
  private commands = new Map<string, BaseCommand>();

  constructor(
    @InjectPinoLogger(CommandHandler.name)
    private readonly logger: PinoLogger,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
  ) {}

  async onModuleInit() {
    await this.discoverCommands();
  }

  private async discoverCommands() {
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
          this.commands.set(metadata.name, instance);
          this.logger.debug(`Discovered command: ${metadata.name}`);
        }
      }
    });

    this.logger.debug(`Total commands discovered: ${this.commands.size}`);
  }

  registerCommands(bot: Bot) {
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
            this.logger.debug(`Sending usage info for ${name}`);
            await ctx.reply(metadata.usage);
            return;
          }

          // this.logger.debug(`Executing ${name} command handler`);
          await command.execute(ctx);
          // this.logger.debug(`Finished executing ${name} command`);
        } catch (error) {
          this.logger.error(`Error executing command ${name}:`, error);
          await ctx.reply(
            'Sorry, something went wrong while processing your command.',
          );
        }
      });
    });

    // Register unknown command handler
    bot.on('message:text', async (ctx) => {
      const text = ctx.message?.text?.trim();

      if (text?.startsWith('/')) {
        const command = text.split(' ')[0].substring(1);
        if (!this.commands.has(command)) {
          await ctx.reply(
            'Unknown command. Try using /help to see available commands.',
            { parse_mode: 'Markdown' },
          );
        }
      }
    });
  }
}
