import { Injectable, UseGuards } from '@nestjs/common';
import { Context } from 'grammy';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GoogleSheetsService } from '../../google-sheets/google-sheets.service';
import { Command } from 'src/common/decorators/command.decorator';
import { BaseCommand } from './base.command';
import { InlineKeyboard } from 'grammy';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

interface PropertyCache {
  [key: string]: {
    propertyId: string;
    propertyName: string;
    expectingAmount?: boolean;
  };
}

@Injectable()
@Command({
  name: 'record_capex',
  description: 'Record capital expenditure for a property',
  usage: 'Usage: /record_capex',
})
@UseGuards(RolesGuard)
@Roles('admin')
export class RecordCapexCommand extends BaseCommand {
  private propertyCache: PropertyCache = {};

  constructor(
    @InjectPinoLogger(RecordCapexCommand.name)
    protected readonly logger: PinoLogger,
    private readonly sheetsService: GoogleSheetsService,
  ) {
    super(logger);
  }

  async execute(ctx: Context): Promise<void> {
    try {
      const config = this.sheetsService.GSHEET_CONFIGS.capex;
      const range = `${config.property_data.worksheet_name}!${config.property_data.range}`;
      const rows = await this.sheetsService.getValues(
        config.workbook_id,
        range,
      );

      if (!rows || rows.length === 0) {
        await ctx.reply('❌ No properties found in the sheet.');
        return;
      }

      const keyboard = new InlineKeyboard();
      let activeCount = 0;
      this.propertyCache = {};

      for (const row of rows) {
        if (row.length >= 15 && row[15]?.toUpperCase() === 'TRUE') {
          if (activeCount >= 10) break;

          const propertyId = row[config.property_data.columns.unique_id];
          const propertyName = row[config.property_data.columns.property_name];

          if (!propertyId || !propertyName) continue;

          this.propertyCache[propertyId] = {
            propertyId,
            propertyName,
          };

          keyboard
            .text(
              `📦 ${propertyId} | ${propertyName}`,
              `record_capex_callback:${propertyId}`,
            )
            .row();

          activeCount++;
        }
      }

      if (activeCount === 0) {
        await ctx.reply('❌ No active properties found.');
        return;
      }

      await ctx.reply(
        '💰 Record Capex\n\nSelect a property from the list below:',
        {
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      this.logger.error('Error in capex command:', error);
      await ctx.reply('An error occurred while fetching properties.');
    }
  }

  async handleCallback(ctx: Context): Promise<void> {
    try {
      const callbackData = ctx.callbackQuery?.data;
      if (!callbackData?.startsWith('record_capex_callback:')) return;

      const propertyId = callbackData.split(':')[1];
      const property = this.propertyCache[propertyId];

      if (!property) {
        await ctx.reply('❌ Property details not found. Please try again.');
        return;
      }

      await ctx.reply(
        '💰 Record Capex\n\n' +
          `Property: ${property.propertyName}\n` +
          `Property ID: ${property.propertyId}\n\n` +
          'Enter amount \n' +
          "Type 'cancel' to abort the operation.",
      );

      this.propertyCache[propertyId].expectingAmount = true;
    } catch (error) {
      this.logger.error('Error handling property selection:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your selection.',
      );
    }
  }

  async handleMessage(ctx: Context): Promise<void> {
    try {
      const text = ctx.message?.text?.trim().toLowerCase();
      if (!text) return;

      const propertyId = Object.keys(this.propertyCache).find(
        (key) => this.propertyCache[key].expectingAmount,
      );

      if (!propertyId) return;

      if (['cancel', '/cancel', 'abort', '/abort'].includes(text)) {
        delete this.propertyCache[propertyId];
        await ctx.reply(
          '❌ Recording cancelled. Use /record_capex to start over.',
        );
        return;
      }

      const amount = parseFloat(text);
      if (isNaN(amount)) {
        await ctx.reply(
          '❌ Please enter a valid number (e.g., 500)\n\n' +
            "Type 'cancel' to abort the operation, or try again with a valid number.",
        );
        return;
      }

      const payment = await this.sheetsService.recordCapex(propertyId, amount);
      delete this.propertyCache[propertyId];

      await ctx.reply(
        `✅ Capex recorded successfully!\n\n` +
          `📦 Property: ${payment.productId}\n` +
          `💰 Amount: ${payment.amount}\n` +
          `📅 Date: ${payment.date}\n` +
          `Use /record_capex to record another expense`,
      );
    } catch (error) {
      this.logger.error('Error handling amount:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your input.',
      );
    }
  }
}
