import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { Bot, Context } from 'grammy';
import {
  COMMAND_METADATA,
  CommandMetadata,
} from 'src/common/decorators/command.decorator';
import { TelegramCommand } from 'src/app.types';
import { RolesGuard } from 'src/common/guards/role.guard';
import { CommandRegistryService } from 'src/telegram/command-registry.service';

@Injectable()
export class CommandHandler implements OnModuleInit {
  private isInitialized = false;
  private readonly logger = new Logger(CommandHandler.name);

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly rolesGuard: RolesGuard,
    public commandRegistry: CommandRegistryService,
  ) {}

  async onModuleInit() {
    if (!this.isInitialized) {
      await this.discoverCommands();
      this.isInitialized = true;

      // Log registration summary
      const counts = this.commandRegistry.getHandlerCounts();
      this.logger.log(
        `Command registration complete. Found: ${counts.commands} commands, ${counts.callbacks} callbacks, ${counts.messages} message handlers`,
      );
    }
  }

  private async discoverCommands() {
    this.logger.debug('Starting command discovery...');
    const wrappers = this.discoveryService.getProviders();

    wrappers.forEach((wrapper) => {
      const { instance } = wrapper;

      if (instance && instance.execute) {
        const metadata = Reflect.getMetadata(
          COMMAND_METADATA,
          instance.constructor,
        ) as CommandMetadata;

        if (metadata?.name) {
          this.commandRegistry.registerCommand(instance);
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
      this.logger.error(`Error executing command ${command.name}:`, error);
      await ctx.reply('❌ An error occurred while executing the command.');
    }
  }

  async registerCommands(bot: Bot) {
    try {
      if (!bot) {
        this.logger.warn('Bot not initialized - skipping command registration');
        return;
      }

      if (!this.isInitialized) {
        try {
          await this.discoverCommands();
          this.isInitialized = true;
        } catch (error) {
          this.logger.error('Error during command discovery:', error);
          return; // Exit early if commands cannot be discovered
        }
      }

      this.logger.debug('Registering bot command handlers...');

      // Get commands from registry
      let commands;
      try {
        commands = this.commandRegistry.getRegisteredCommands();
      } catch (error) {
        this.logger.error('Error retrieving registered commands:', error);
        return; // Exit early if commands cannot be retrieved
      }

      // Register command handlers
      commands.forEach((command) => {
        try {
          this.logger.debug(`Registering command handler: ${command.name}`);
          bot.command(command.name, (ctx) => this.handleCommand(command, ctx));
        } catch (error) {
          this.logger.error(
            `Error registering command handler for ${command.name}:`,
            error,
          );
        }
      });

      // Register callback query handlers
      bot.on('callback_query:data', async (ctx) => {
        try {
          await this.commandRegistry.handleCallback(ctx);
        } catch (error) {
          this.logger.error('Error in callback query handler:', error);
          await ctx.reply(
            '❌ An error occurred while processing your request.',
          );
        }
      });

      // Register message handlers
      bot.on('message:text', async (ctx) => {
        try {
          await this.commandRegistry.handleMessage(ctx);
        } catch (error) {
          this.logger.error('Error in message handler:', error);
          await ctx.reply(
            '❌ An error occurred while processing your message.',
          );
        }
      });

      this.logger.log('Bot command handlers registered successfully');
    } catch (error) {
      this.logger.error(
        'Unexpected error during bot command registration:',
        error,
      );
    }
  }
}
