import { Context } from 'grammy';
import { PinoLogger } from 'nestjs-pino';

export abstract class BaseCommand {
  constructor(protected readonly logger: PinoLogger) {}
  abstract execute(ctx: Context): Promise<void>;
}
