import { Injectable, UseGuards } from '@nestjs/common';
import { Context } from 'grammy';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Command } from 'src/common/decorators/command.decorator';
import { BaseCommand } from '../../telegram/commands/base.command';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { InlineKeyboard } from 'grammy';
import { MobileMoneyService } from 'src/mobile-money/mobile-money.service';

interface PaymentState {
  recipient?: string;
  amount?: number;
  selectedContact?: {
    name: string;
    phoneNumber: string;
  };
  expectingAmount?: boolean;
  expectingConfirmation?: boolean;
}

@Injectable()
@Command({
  name: 'send_money',
  description: 'Send mobile money to a contact',
  usage: 'Usage: /send_money or "Send [amount] to [name]"',
})
@UseGuards(RolesGuard)
@Roles('admin')
export class MobileMoneyCommand extends BaseCommand {
  private paymentStates: Map<number, PaymentState> = new Map();

  constructor(
    @InjectPinoLogger(MobileMoneyCommand.name)
    protected readonly logger: PinoLogger,
    private readonly mobileMoneyService: MobileMoneyService,
  ) {
    super(logger);
  }

  async execute(ctx: Context): Promise<void> {
    try {
      const status = await this.mobileMoneyService.getConnectionStatus();

      if (!status.isConnected) {
        await ctx.reply(
          '⚠️ Warning: Phone connection not available\n' +
            (status.contactCount > 0
              ? `Using ${status.contactCount} cached contacts from ${status.lastSync?.toLocaleString()}`
              : 'No contacts available - please check phone connection'),
        );
        if (status.contactCount === 0) {
          return;
        }
      }

      await ctx.reply(
        '💸 Mobile Money Transfer\n\n' +
          'You can either:\n' +
          '1. Type "Send [amount] to [name]"\n' +
          '2. Or follow the interactive process:\n' +
          '   - Enter recipient name\n' +
          '   - Select from matching contacts\n' +
          '   - Enter amount\n' +
          '   - Confirm transaction\n\n' +
          'Example: "Send 100 to John"',
      );
    } catch (error) {
      this.logger.error('Error in mobile money command:', error);
      await ctx.reply(
        'An error occurred while starting the money transfer process.',
      );
    }
  }

  async handleMessage(ctx: Context): Promise<void> {
    try {
      const text = ctx.message?.text?.trim();
      const userId = ctx.from?.id;

      if (!text || !userId) return;

      // Check for natural language input pattern: "Send X to Y"
      const sendMoneyMatch = text.match(
        /^(?:send|transfer)\s+(\d+(?:\.\d{1,2})?)\s+(?:to|for)\s+(.+)$/i,
      );

      if (sendMoneyMatch) {
        const [, amountStr, recipientName] = sendMoneyMatch;
        const amount = parseFloat(amountStr);

        const contacts =
          await this.mobileMoneyService.findContacts(recipientName);

        if (contacts.length === 0) {
          await ctx.reply('❌ No contacts found with that name.');
          return;
        }

        const keyboard = new InlineKeyboard();
        contacts.forEach((contact) => {
          keyboard
            .text(
              `👤 ${contact.name} (${contact.phoneNumber})`,
              `send_money_contact:${contact.phoneNumber}`,
            )
            .row();
        });

        this.paymentStates.set(userId, { amount, recipient: recipientName });

        await ctx.reply(
          `📱 Found ${contacts.length} matching contact(s) for "${recipientName}"\n` +
            `💰 Amount: GHS ${amount}\n\n` +
            'Please select the correct contact:',
          { reply_markup: keyboard },
        );
        return;
      }

      // Handle other states of the conversation
      const state = this.paymentStates.get(userId);
      if (!state) return;

      if (state.expectingConfirmation) {
        if (text.toLowerCase() === 'confirm') {
          await this.mobileMoneyService.sendMoney(
            state.amount!,
            state.selectedContact!.phoneNumber,
          );

          await ctx.reply(
            '✅ Payment sent successfully!\n\n' +
              `To: ${state.selectedContact!.name}\n` +
              `Amount: GHS ${state.amount}\n` +
              `Phone: ${state.selectedContact!.phoneNumber}`,
          );

          this.paymentStates.delete(userId);
        } else if (text.toLowerCase() === 'cancel') {
          this.paymentStates.delete(userId);
          await ctx.reply('❌ Transaction cancelled.');
        } else {
          await ctx.reply(
            'Please type "confirm" to proceed with the payment or "cancel" to abort.',
          );
        }
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your request.',
      );
    }
  }

  async handleCallback(ctx: Context): Promise<void> {
    try {
      const callbackData = ctx.callbackQuery?.data;
      const userId = ctx.from?.id;

      if (!callbackData?.startsWith('send_money_contact:') || !userId) return;

      const phoneNumber = callbackData.split(':')[1];
      const state = this.paymentStates.get(userId);

      if (!state) {
        await ctx.reply(
          '❌ Session expired. Please start over with /send_money',
        );
        return;
      }

      const contact =
        await this.mobileMoneyService.getContactByPhone(phoneNumber);

      if (!contact) {
        await ctx.reply('❌ Contact not found. Please try again.');
        return;
      }

      state.selectedContact = contact;
      state.expectingConfirmation = true;
      this.paymentStates.set(userId, state);

      await ctx.reply(
        '💳 Please confirm the transaction:\n\n' +
          `To: ${contact.name}\n` +
          `Phone: ${contact.phoneNumber}\n` +
          `Amount: GHS ${state.amount}\n\n` +
          'Type "confirm" to proceed or "cancel" to abort.',
      );
    } catch (error) {
      this.logger.error('Error handling callback:', error);
      await ctx.reply(
        'Sorry, something went wrong while processing your selection.',
      );
    }
  }
}
