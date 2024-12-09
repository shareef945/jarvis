import { Injectable, UseGuards } from '@nestjs/common';
import { Context } from 'grammy';
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
    amount?: number;
    description?: string;
    isActive?: boolean;
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

  constructor(private readonly sheetsService: GoogleSheetsService) {
    super();
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
      this.propertyCache = {};

      for (const row of rows) {
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

      // Reset all properties to inactive
      Object.keys(this.propertyCache).forEach((key) => {
        this.propertyCache[key].isActive = false;
      });

      // Mark this property as active
      property.isActive = true;

      await ctx.reply(
        '💰 Record Capex\n\n' +
          `Property: ${property.propertyName}\n` +
          `Property ID: ${property.propertyId}\n\n` +
          'Enter amount:\n' +
          "Type 'cancel' to abort the operation.",
      );
    } catch (error) {
      this.logger.error('Error handling property selection:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your selection.',
      );
    }
  }

  async handleMessage(ctx: Context): Promise<void> {
    try {
      const text = ctx.message?.text?.trim();
      if (!text) return;

      // Find the active property instead of any property without description
      const propertyId = Object.keys(this.propertyCache).find(
        (key) => this.propertyCache[key].isActive,
      );

      if (!propertyId) return;

      if (
        ['cancel', '/cancel', 'abort', '/abort'].includes(text.toLowerCase())
      ) {
        delete this.propertyCache[propertyId];
        await ctx.reply(
          '❌ Recording cancelled. Use /record_capex to start over.',
        );
        return;
      }

      const property = this.propertyCache[propertyId];

      if (!property.amount) {
        const amount = parseFloat(text);
        if (isNaN(amount)) {
          await ctx.reply(
            '❌ Please enter a valid number (e.g., 500)\n\n' +
              "Type 'cancel' to abort the operation, or try again with a valid number.",
          );
          return;
        }

        property.amount = amount;
        await ctx.reply(
          '📝 Please enter a description for this expense:\n\n' +
            "Type 'cancel' to abort the operation.",
        );
        return;
      }

      if (property.amount && !property.description) {
        property.description = text;

        const payment = await this.sheetsService.recordCapex(
          property.propertyId,
          property.propertyName,
          property.amount,
          property.description,
        );

        delete this.propertyCache[propertyId];

        await ctx.reply(
          `✅ Capex recorded successfully!\n\n` +
            `📦 Property: ${payment.propertyName}\n` +
            `💰 Amount: ${payment.amount}\n` +
            `📝 Description: ${payment.description}\n` +
            `📅 Date: ${payment.date}\n` +
            `Use /record_capex to record another expense`,
        );
      }
    } catch (error) {
      this.logger.error('Error handling input:', error);
      if (error.stack) {
        this.logger.error('Stack trace:', error.stack);
      }
      await ctx.reply(
        'Sorry, something went wrong while processing your input.',
      );
    }
  }
}
