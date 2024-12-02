import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { HttpService } from '@nestjs/axios';
import { ActionRegistryService } from './action-registry.service';
import { firstValueFrom } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable()
export class LlmService {
  private readonly baseUrl: string = 'http://localhost:11434/api';
  private conversationHistory: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }> = [];

  constructor(
    @InjectPinoLogger(LlmService.name)
    private readonly logger: PinoLogger,
    private readonly httpService: HttpService,
    private readonly actionRegistry: ActionRegistryService,
  ) {
    // Initialize with system prompt
    this.conversationHistory.push({
      role: 'system',
      content: this.getSystemPrompt(),
    });
  }

  private getSystemPrompt(): string {
    const actionSchema = this.actionRegistry.getActionSchema();
    return `You are a helpful AI assistant that can perform various actions.
Here are the actions available to you:

${actionSchema}

When a user requests an action, analyze their request and:
1. Determine which action to use
2. Extract the necessary parameters
3. Confirm with the user before executing
4. Format your response as JSON when executing an action:
{
  "action": "actionName",
  "parameters": {
    "param1": "value1",
    ...
  },
  "confirmation": "Human-readable confirmation message"
}

If you're unsure about any parameters, ask the user for clarification.
If no action is needed, respond conversationally.`;
  }

  async chat(
    message: string,
    modelName: string = 'llama2',
  ): Promise<{
    reply: string;
    action?: {
      name: string;
      parameters: any;
    };
  }> {
    try {
      this.conversationHistory.push({ role: 'user', content: message });

      const context = this.conversationHistory
        .map((msg) => `${msg.role}: ${msg.content}`)
        .join('\n');

      const response = await firstValueFrom(
        this.httpService
          .post(
            `${this.baseUrl}/generate`,
            {
              model: modelName,
              prompt: `${context}\nassistant:`,
              stream: false,
            },
            {
              headers: {
                'Content-Type': 'application/json',
              },
            },
          )
          .pipe(
            map((res) => res.data),
            catchError((error) => {
              this.logger.error('Error calling Ollama API:', error);
              throw new Error('Failed to communicate with LLM service');
            }),
          ),
      );

      const reply = response.response;
      this.conversationHistory.push({ role: 'assistant', content: reply });

      // Try to parse action from response
      try {
        const actionData = JSON.parse(reply);
        if (actionData.action && actionData.parameters) {
          return {
            reply: actionData.confirmation,
            action: {
              name: actionData.action,
              parameters: actionData.parameters,
            },
          };
        }
      } catch (e) {
        // Not an action response, treat as normal conversation
      }

      return { reply };
    } catch (error) {
      this.logger.error('Error in chat:', error);
      throw new Error('Failed to process chat message');
    }
  }

  async executeAction(actionName: string, parameters: any): Promise<any> {
    const action = this.actionRegistry.getAction(actionName);
    if (!action) {
      throw new Error(`Unknown action: ${actionName}`);
    }

    try {
      return await action.handler(parameters);
    } catch (error) {
      this.logger.error(`Error executing action ${actionName}:`, error);
      throw new Error(`Failed to execute action: ${error.message}`);
    }
  }

  async clearHistory(): Promise<void> {
    this.conversationHistory = [
      {
        role: 'system',
        content: this.getSystemPrompt(),
      },
    ];
  }

  getConversationHistory() {
    return [...this.conversationHistory];
  }
}
