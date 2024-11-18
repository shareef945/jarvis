import { Context } from 'grammy';

export interface Command {
  name: string;
  description: string;
  usage?: string;
  execute(ctx: Context): Promise<void>;
}

export interface ProgressCallback {
  (current: number, total: number): Promise<void>;
}
