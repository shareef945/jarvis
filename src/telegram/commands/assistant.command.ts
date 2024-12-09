import { Context } from 'grammy';
import { Command } from '../../common/decorators/command.decorator';
import { Injectable, Logger } from '@nestjs/common';
import { LlmService } from '../../llm/llm.service';
import { TelegramCommand } from '../../app.types';

@Injectable()
@Command({
  name: 'chat',
  description: 'Chat with AI assistant and perform actions',
})
export class ChatCommand implements TelegramCommand {
  readonly name = 'chat';
  readonly description = 'Chat with AI assistant and perform actions';
  private readonly logger = new Logger(ChatCommand.name);

  constructor(private readonly llmService: LlmService) {}

  async execute(ctx: Context): Promise<void> {
    await ctx.reply(
      "Hi! I'm your AI assistant. I can help you perform various actions. What would you like me to do?",
      {
        reply_markup: {
          force_reply: true,
        },
      },
    );
  }

  async handleMessage(ctx: Context): Promise<void> {
    if (!ctx.message?.text) return;

    try {
      await ctx.replyWithChatAction('typing');

      const result = await this.llmService.chat(ctx.message.text);

      if (result.action) {
        // If action is identified, ask for confirmation
        await ctx.reply(
          `${result.reply}\n\nShould I proceed with this action?`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '✅ Yes, proceed',
                    callback_data: `execute_${result.action.name}_${JSON.stringify(
                      result.action.parameters,
                    )}`,
                  },
                  {
                    text: '❌ No, cancel',
                    callback_data: 'cancel_action',
                  },
                ],
              ],
            },
          },
        );
      } else {
        // Normal conversation response
        await ctx.reply(result.reply, {
          reply_to_message_id: ctx.message.message_id,
        });
      }
    } catch (error) {
      this.logger.error('Error in chat command:', error);
      await ctx.reply(
        'Sorry, I encountered an error while processing your message. Please try again.',
      );
    }
  }

  async handleCallback(ctx: Context): Promise<void> {
    const callbackData = ctx.callbackQuery?.data;
    if (!callbackData) return;

    if (callbackData === 'cancel_action') {
      await ctx.editMessageText('Action cancelled.');
      return;
    }

    if (callbackData.startsWith('execute_')) {
      const [, actionName, paramsJson] = callbackData.split('_');
      const parameters = JSON.parse(paramsJson);

      try {
        const result = await this.llmService.executeAction(
          actionName,
          parameters,
        );
        await ctx.editMessageText(
          `✅ Action completed successfully!\n\nResult: ${JSON.stringify(
            result,
            null,
            2,
          )}`,
        );
      } catch (error) {
        this.logger.error('Error executing action:', error);
        await ctx.editMessageText(
          '❌ Failed to execute action: ' + error.message,
        );
      }
    }
  }
}
