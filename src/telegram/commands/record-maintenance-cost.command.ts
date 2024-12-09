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
    expectingAmount?: boolean;
    amount?: number;
    expectingCategory?: boolean;
    category?: string;
    expectingDescription?: boolean;
  };
}

const MAINTENANCE_CATEGORIES = [
  'Wi-Fi',
  'Electricity',
  'General Repairs',
  'Cleaning',
  'Misc',
  'Mohammed',
];

@Injectable()
@Command({
  name: 'record_maintenance_cost',
  description: 'record maintenance cost for sai-real estate',
  usage: 'Usage: /record_maintenance_cost',
})
@UseGuards(RolesGuard)
@Roles('admin')
export class RecordMaintenanceCostCommand extends BaseCommand {
  private propertyCache: PropertyCache = {};

  constructor(private readonly sheetsService: GoogleSheetsService) {
    super();
  }
  async execute(ctx: Context): Promise<void> {
    try {
      const config = this.sheetsService.GSHEET_CONFIGS.maintenance_cost;
      const range = `${config.property_data.worksheet_name}!${config.property_data.range}`;
      const rows = await this.sheetsService.getValues(
        config.workbook_id,
        range,
      );

      if (!rows || rows.length === 0) {
        this.logger.debug('No rows returned from spreadsheet');
        await ctx.reply('❌ No properties found in the sheet.');
        return;
      }

      const keyboard = new InlineKeyboard();
      this.propertyCache = {};

      for (const row of rows) {
        const propertyId = row[config.property_data.columns.unique_id];
        const propertyName = row[config.property_data.columns.property_name];

        if (!propertyId || !propertyName) {
          this.logger.warn('Skipping row due to missing required fields', {
            propertyId,
            propertyName,
          });
          continue;
        }

        this.propertyCache[propertyId] = {
          propertyId,
          propertyName,
        };

        keyboard
          .text(
            `📦 ${propertyId} | ${propertyName}`,
            `record_maintenance_cost_callback:${propertyId}`,
          )
          .row();
      }

      await ctx.reply(
        '🧾 Record Maintenance Cost\n\nSelect a property from the list below:',
        {
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      this.logger.error('Error in maintenance cost command:', error);
      await ctx.reply('An error occurred while fetching properties.');
    }
  }

  async handleCallback(ctx: Context): Promise<void> {
    try {
      const callbackData = ctx.callbackQuery?.data;
      if (!callbackData) return;

      if (callbackData.startsWith('record_maintenance_cost_callback:')) {
        const propertyId = callbackData.split(':')[1];
        const property = this.propertyCache[propertyId];

        if (!property) {
          await ctx.reply('❌ Property details not found. Please try again.');
          return;
        }

        await ctx.reply(
          '🧾 Record Maintenance Cost\n\n' +
            `Property: ${property.propertyName}\n` +
            `Property ID: ${property.propertyId}\n\n` +
            'Enter amount \n' +
            "Type 'cancel' to abort the operation.",
        );

        this.propertyCache[propertyId].expectingAmount = true;
      } else if (callbackData.startsWith('maintenance_category:')) {
        const [, propertyId, category] = callbackData.split(':');
        const property = this.propertyCache[propertyId];

        if (!property) {
          await ctx.reply('❌ Property details not found. Please try again.');
          return;
        }

        property.category = category;
        property.expectingCategory = false;
        property.expectingDescription = true;

        await ctx.reply(
          `Category selected: ${category}\n\n` +
            'Enter description of the maintenance work\n' +
            "Type 'cancel' to abort the operation.",
        );
      }
    } catch (error) {
      this.logger.error('Error handling callback:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your selection.',
      );
    }
  }

  async handleMessage(ctx: Context): Promise<void> {
    try {
      const text = ctx.message?.text?.trim();
      if (!text) return;

      const propertyId = Object.keys(this.propertyCache).find(
        (key) =>
          this.propertyCache[key].expectingAmount ||
          this.propertyCache[key].expectingCategory ||
          this.propertyCache[key].expectingDescription,
      );

      if (!propertyId) return;
      const property = this.propertyCache[propertyId];

      if (
        ['cancel', '/cancel', 'abort', '/abort'].includes(text.toLowerCase())
      ) {
        delete this.propertyCache[propertyId];
        await ctx.reply(
          '❌ Recording cancelled. Use /record_maintenance_cost to start over.',
        );
        return;
      }

      // Handle amount input
      if (property.expectingAmount) {
        const amount = parseFloat(text);
        if (isNaN(amount)) {
          await ctx.reply(
            '❌ Please enter a valid number (e.g., 500)\n\n' +
              "Type 'cancel' to abort the operation, or try again with a valid number.",
          );
          return;
        }

        property.amount = amount;
        property.expectingAmount = false;
        property.expectingCategory = true;

        // Create keyboard with category options
        const keyboard = new InlineKeyboard();
        MAINTENANCE_CATEGORIES.forEach((category) => {
          keyboard
            .text(category, `maintenance_category:${propertyId}:${category}`)
            .row();
        });

        await ctx.reply('Select maintenance category:', {
          reply_markup: keyboard,
        });
        return;
      }

      // Handle description input
      if (property.expectingDescription) {
        const payment = await this.sheetsService.recordMaintenanceCost(
          propertyId,
          property.amount!,
          property.category!,
          text, // description
          property.propertyName,
        );
        delete this.propertyCache[propertyId];

        await ctx.reply(
          `✅ Maintenance cost recorded successfully!\n\n` +
            `📦 Property: ${payment.propertyName}\n` +
            `💰 Amount: ${payment.amount}\n` +
            `🏷️ Category: ${payment.category}\n` +
            `📝 Description: ${payment.description}\n` +
            `📅 Date: ${payment.date}\n` +
            `Use /record_maintenance_cost to record another cost`,
        );
      }
    } catch (error) {
      this.logger.error('Error handling input:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your input.',
      );
    }
  }
}
