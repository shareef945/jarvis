import { Context } from 'grammy';
import { PinoLogger } from 'nestjs-pino';
import { TelegramCommand } from 'src/app.types';
import {
  COMMAND_METADATA,
  CommandMetadata,
} from 'src/common/decorators/command.decorator';

export abstract class BaseCommand implements TelegramCommand {
  name: string;
  description: string;
  usage?: string;

  constructor(protected readonly logger: PinoLogger) {
    const metadata = Reflect.getMetadata(
      COMMAND_METADATA,
      this.constructor,
    ) as CommandMetadata;
    this.name = metadata.name;
    this.description = metadata.description;
    this.usage = metadata.usage;
  }

  abstract execute(ctx: Context): Promise<void>;

  async handleCallback?(ctx: Context): Promise<void> {}

  async handleMessage?(ctx: Context): Promise<void> {}
}
