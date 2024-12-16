import { Injectable, UseGuards } from '@nestjs/common';
import { Context } from 'grammy';
import { GoogleSheetsService } from '../../google-sheets/google-sheets.service';
import { Command } from 'src/common/decorators/command.decorator';
import { InlineKeyboard } from 'grammy';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/role.guard';

import { BaseCommand } from './base.command';

interface ProductCache {
  [key: string]: {
    productId: string;
    customerName: string;
    weeklyInstallment: string;
    expectingAmount?: boolean;
  };
}

@Injectable()
@Command({
  name: 'record_payment',
  description: 'Record a payment for a product',
  usage: 'Usage: /record_payment',
})
@UseGuards(RolesGuard)
@Roles('admin')
export class RecordPaymentCommand extends BaseCommand {
  private productCache: ProductCache = {};

  readonly callbackPatterns = ['record_payment_callback:'];

  constructor(private readonly sheetsService: GoogleSheetsService) {
    super();
  }
  async execute(ctx: Context): Promise<void> {
    try {
      const config = this.sheetsService.GSHEET_CONFIGS.sales_tracking;
      const range = `${config.product_data.worksheet_name}!${config.product_data.range}`;
      const rows = await this.sheetsService.getValues(
        config.workbook_id,
        range,
      );

      if (!rows || rows.length === 0) {
        await ctx.reply('❌ No products found in the product sheet.');
        return;
      }

      const keyboard = new InlineKeyboard();
      let activeCount = 0;
      this.productCache = {};

      for (const row of rows) {
        if (row.length >= 15 && row[15]?.toUpperCase() === 'TRUE') {
          if (activeCount >= 10) break;

          const productId = row[config.product_data.columns.product_id];
          const customerName = row[config.product_data.columns.customer_name];
          const weeklyInstallment =
            row[config.product_data.columns.weekly_installment];

          if (!productId || !customerName || !weeklyInstallment) {
            continue;
          }

          this.productCache[productId] = {
            productId,
            customerName,
            weeklyInstallment,
          };

          keyboard
            .text(
              `📦 ${productId} | ${customerName}\n💰 Weekly: ${weeklyInstallment}`,
              `record_payment_callback:${productId}`,
            )
            .row();

          activeCount++;
        }
      }

      if (activeCount === 0) {
        await ctx.reply('❌ No active products found.');
        return;
      }

      await ctx.reply(
        '🧾 Record Payment\n\nSelect a product from the list below:',
        {
          reply_markup: keyboard,
        },
      );
    } catch (error) {
      this.logger.error('Error in record payment command:', error);
      await ctx.reply('An error occurred while fetching products.');
    }
  }

  async handleCallback(ctx: Context): Promise<void> {
    try {
      const callbackData = ctx.callbackQuery?.data;
      if (!callbackData?.startsWith('record_payment_callback:')) return;

      const productId = callbackData.split(':')[1];
      const product = this.productCache[productId];

      if (!product) {
        await ctx.reply('❌ Product details not found. Please try again.');
        return;
      }

      await ctx.reply(
        '🧾 Record Payment\n\n' +
          `Customer: ${product.customerName}\n` +
          `Product ID: ${product.productId}\n` +
          `Weekly Installment: ${product.weeklyInstallment}\n\n` +
          'Enter amount \n' +
          "Type 'cancel' to abort the operation.",
      );

      this.productCache[productId].expectingAmount = true;
    } catch (error) {
      this.logger.error('Error handling product selection:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your selection.',
      );
    }
  }

  async handleMessage(ctx: Context): Promise<void> {
    try {
      const text = ctx.message?.text?.trim().toLowerCase();
      if (!text) return;

      const productId = Object.keys(this.productCache).find(
        (key) => this.productCache[key].expectingAmount,
      );

      if (!productId) return;

      if (['cancel', '/cancel', 'abort', '/abort'].includes(text)) {
        delete this.productCache[productId];
        await ctx.reply(
          '❌ Payment recording cancelled. Use /record_payment to start over.',
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

      const payment = await this.sheetsService.recordWeeklySalesPayment(
        productId,
        amount,
      );
      delete this.productCache[productId];

      await ctx.reply(
        `✅ Payment recorded successfully!\n\n` +
          `📦 Product: ${payment.productId}\n` +
          `💰 Amount: ${payment.amount}\n` +
          `📅 Date: ${payment.date}\n` +
          `⏰ Days Late: ${payment.daysLate}\n\n` +
          `Use /record_payment to record another payment`,
      );
    } catch (error) {
      this.logger.error('Error handling payment amount:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your payment.',
      );
    }
  }
}
