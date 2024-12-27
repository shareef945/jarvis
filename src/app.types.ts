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

interface MaintenanceCost {
  amount: number;
  description: string;
  property: string;
}

interface PropertyQuery {
  property: string;
  timeframe: string;
}

interface PersonQuery {
  person: string;
}

export interface Tools {
  addMaintenanceCost: (params: MaintenanceCost) => Promise<string>;
  queryOwedAmount: (params: PersonQuery) => Promise<string>;
  getPropertyCosts: (params: PropertyQuery) => Promise<string>;
}