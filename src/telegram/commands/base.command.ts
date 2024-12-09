import { Context } from 'grammy';
import { Logger } from '@nestjs/common'; // Change this import
import { TelegramCommand } from 'src/app.types';
import {
  COMMAND_METADATA,
  CommandMetadata,
} from 'src/common/decorators/command.decorator';

export abstract class BaseCommand implements TelegramCommand {
  name: string;
  description: string;
  usage?: string;
  protected readonly logger: Logger; // Change type to Logger

  constructor() {
    const metadata = Reflect.getMetadata(
      COMMAND_METADATA,
      this.constructor,
    ) as CommandMetadata;
    this.name = metadata.name;
    this.description = metadata.description;
    this.usage = metadata.usage;
    this.logger = new Logger(this.constructor.name); // Initialize logger with class name
  }

  abstract execute(ctx: Context): Promise<void>;

  async handleCallback?(ctx: Context): Promise<void> {}

  async handleMessage?(ctx: Context): Promise<void> {}
}
