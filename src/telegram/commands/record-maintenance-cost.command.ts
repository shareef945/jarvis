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
  name: 'record_maintenance_cost',
  description: 'record maintenance cost for sai-real estate',
  usage: 'Usage: /record_maintenance_cost',
})
@UseGuards(RolesGuard)
@Roles('admin')
export class RecordMaintenanceCostCommand extends BaseCommand {
  private propertyCache: PropertyCache = {};

  constructor(
    @InjectPinoLogger(RecordMaintenanceCostCommand.name)
    protected readonly logger: PinoLogger,
    private readonly sheetsService: GoogleSheetsService,
  ) {
    super(logger);
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
      let activeCount = 0;
      this.propertyCache = {};

      for (const row of rows) {
        if (row.length >= 15 && row[15]?.toUpperCase() === 'TRUE') {
          if (activeCount >= 10) break;

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

          activeCount++;
        }
      }

      if (activeCount === 0) {
        this.logger.debug('No properties found');
        await ctx.reply('❌ No properties found');
        return;
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
      if (!callbackData?.startsWith('record_maintenance_cost_callback:'))
        return;

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
          '❌ Recording cancelled. Use /record_maintenance_cost to start over.',
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

      const payment = await this.sheetsService.recordPayment(
        propertyId,
        amount,
      );
      delete this.propertyCache[propertyId];

      await ctx.reply(
        `✅ Maintenance cost recorded successfully!\n\n` +
          `📦 Property: ${payment.productId}\n` +
          `💰 Amount: ${payment.amount}\n` +
          `📅 Date: ${payment.date}\n` +
          `Use /record_maintenance_cost to record another cost`,
      );
    } catch (error) {
      this.logger.error('Error handling amount:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your input.',
      );
    }
  }
}
