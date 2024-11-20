import { Injectable, UseGuards } from '@nestjs/common';
import { Context } from 'grammy';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { GoogleSheetsService } from '../../google-sheets/google-sheets.service';
import {
  Command,
  COMMAND_METADATA,
  CommandMetadata,
} from 'src/common/decorators/command.decorator';
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
  private readonly metadata: CommandMetadata;
  private propertyCache: PropertyCache = {};

  constructor(
    @InjectPinoLogger(RecordMaintenanceCostCommand.name)
    protected readonly logger: PinoLogger,
    private readonly sheetsService: GoogleSheetsService,
  ) {
    super(logger);
    this.metadata = Reflect.getMetadata(COMMAND_METADATA, this.constructor);
  }

  async execute(ctx: Context): Promise<void> {
    try {
      const config = this.sheetsService.GSHEET_CONFIGS.maintenance_cost;
      // this.logger.debug(
      //   `Attempting to fetch data with config: ${JSON.stringify(config)}`,
      // );

      const range = `${config.product_data.worksheet_name}!${config.product_data.range}`;
      // this.logger.debug(
      //   `Fetching from spreadsheet: ${config.workbook_id}, range: ${range}`,
      // );

      const rows = await this.sheetsService.getValues(
        config.workbook_id,
        range,
      );

      if (!rows || rows.length === 0) {
        this.logger.debug('No rows returned from spreadsheet');
        await ctx.reply('❌ No products found in the product sheet.');
        return;
      }

      const keyboard = new InlineKeyboard();
      let activeCount = 0;

      // Clear previous cache
      this.propertyCache = {};

      // this.logger.debug(`Processing ${rows.length} rows from spreadsheet`);

      for (const row of rows) {
        // Check if product is active (column 15)
        if (row.length >= 15 && row[15]?.toUpperCase() === 'TRUE') {
          if (activeCount >= 10) {
            this.logger.debug(
              'Reached maximum of 10 active products, breaking loop',
            );
            break;
          }

          const propertyId = row[config.product_data.columns.unique_id];
          const propertyName = row[config.product_data.columns.property_name];

          // Validate required fields
          if (!propertyId || !propertyName) {
            this.logger.warn('Skipping row due to missing required fields', {
              propertyId,
              propertyName,
            });
            continue;
          }

          // Cache the product details
          this.propertyCache[propertyId] = {
            propertyId,
            propertyName,
          };

          // Add button to keyboard
          keyboard.text(`📦 ${propertyId} | ${propertyName}`).row();

          activeCount++;
          // this.logger.debug(`Added product to keyboard: ${productId}`);
        }
      }

      if (activeCount === 0) {
        this.logger.debug('No active products found after processing all rows');
        await ctx.reply('❌ No active products found.');
        return;
      }

      // this.logger.debug(`Sending reply with ${activeCount} active products`);
      await ctx.reply(
        '🧾 Record Payment\n\nSelect a product from the list below:',
        {
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      this.logger.error('Error in record payment command:', {
        error: error.message,
        stack: error.stack,
        config:
          this.sheetsService.GSHEET_CONFIGS?.sales_tracking ||
          'Config not available',
      });
      await ctx.reply(`Error: $${error}`);
    }
  }

  async handleProductSelection(ctx: Context): Promise<void> {
    try {
      const callbackData = ctx.callbackQuery?.data;
      if (!callbackData?.startsWith('payment_prod:')) return;

      const propertyId = callbackData.split(':')[1];
      const property = this.propertyCache[propertyId];

      if (!property) {
        await ctx.reply('❌ Product details not found. Please try again.');
        return;
      }

      await ctx.reply(
        '🧾 Record Maintenance Cost\n\n' +
          `Property: ${property.propertyName}\n` +
          `Property ID: ${property.propertyId}\n` +
          'Enter amount \n' +
          "Type 'cancel' to abort the operation.",
      );

      // Store the context for payment amount handling
      this.propertyCache[propertyId].expectingAmount = true;
    } catch (error) {
      this.logger.error('Error handling product selection:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your selection.',
      );
    }
  }

  async handlePaymentAmount(ctx: Context): Promise<void> {
    try {
      const text = ctx.message?.text?.trim().toLowerCase();
      if (!text) return;

      // Find the product expecting payment
      const propertyId = Object.keys(this.propertyCache).find(
        (key) => this.propertyCache[key].expectingAmount,
      );

      if (!propertyId) return;

      if (['cancel', '/cancel', 'abort', '/abort'].includes(text)) {
        delete this.propertyCache[propertyId];
        await ctx.reply(
          '❌ Payment recording cancelled. Use /record_maintenance_cost to start over.',
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
        `✅ Cost recorded successfully!\n\n` +
          `📦 Product: ${payment.productId}\n` +
          `💰 Amount: ${payment.amount}\n` +
          `📅 Date: ${payment.date}\n` +
          `⏰ Days Late: ${payment.daysLate}\n\n` +
          `Use /record_maintenance_cost to record another payment`,
      );
    } catch (error) {
      this.logger.error('Error handling payment amount:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your payment.',
      );
    }
  }
}
