import { Injectable, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { Bot, Context } from 'grammy';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  COMMAND_METADATA,
  CommandMetadata,
} from 'src/common/decorators/command.decorator';
import { TelegramCommand } from 'src/app.types';
import { RolesGuard } from 'src/common/guards/role.guard';

@Injectable()
export class CommandHandler implements OnModuleInit {
  private commands = new Map<string, TelegramCommand>();
  private isInitialized = false;

  constructor(
    @InjectPinoLogger(CommandHandler.name)
    private readonly logger: PinoLogger,
    private readonly discoveryService: DiscoveryService,
    private readonly rolesGuard: RolesGuard,
  ) {}

  async onModuleInit() {
    if (!this.isInitialized) {
      await this.discoverCommands();
      this.isInitialized = true;
    }
  }

  private async discoverCommands() {
    const wrappers = this.discoveryService.getProviders();

    wrappers.forEach((wrapper) => {
      const { instance } = wrapper;

      if (instance && instance.execute) {
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
  }

  private async handleCommand(command: TelegramCommand, ctx: Context) {
    try {
      const executionContext = {
        getClass: () => command.constructor,
        getHandler: () => command.execute,
        getArgByIndex: (index: number) => (index === 0 ? ctx : undefined),
        getArgs: () => [ctx],
        getType: () => 'http',
        switchToHttp: () => ({ getRequest: () => ctx }),
      };

      const canActivate = await this.rolesGuard.canActivate(
        executionContext as any,
      );

      if (!canActivate) {
        await ctx.reply('❌ You do not have permission to use this command.');
        return;
      }

      await command.execute(ctx);
    } catch (error) {
      this.logger.error('Error executing command:', error);
      await ctx.reply('❌ An error occurred while executing the command.');
    }
  }

  async registerCommands(bot: Bot) {
    if (!this.isInitialized) {
      await this.discoverCommands();
      this.isInitialized = true;
    }

    // Register command handlers
    this.commands.forEach((command, name) => {
      bot.command(name, (ctx) => this.handleCommand(command, ctx));
    });

    // Register callback query handlers
    bot.on('callback_query:data', async (ctx) => {
      for (const command of this.commands.values()) {
        if (command.handleCallback) {
          await command.handleCallback(ctx);
        }
      }
    });

    // Register message handlers
    bot.on('message:text', async (ctx) => {
      for (const command of this.commands.values()) {
        if (command.handleMessage) {
          await command.handleMessage(ctx);
        }
      }
    });
  }
}
