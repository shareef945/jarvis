import { Context } from 'grammy';
export interface TelegramCommand {
  name: string;
  description: string;
  usage?: string;
  execute(ctx: Context): Promise<void>;
  handleCallback?(ctx: Context): Promise<void>;
  handleMessage?(ctx: Context): Promise<void>;
  callbackPatterns?: string[];
}

export interface ProgressCallback {
  (current: number, total: number): Promise<void>;
}
