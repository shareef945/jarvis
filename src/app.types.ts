import { Context } from 'grammy';

export interface Command {
  name: string;
  description: string;
  usage?: string;
  execute(ctx: Context): Promise<void>;
}
