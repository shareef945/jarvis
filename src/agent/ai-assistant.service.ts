import { Injectable, Logger } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
// import { NotionService } from '../notion/notion.service';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';

@Injectable()
export class AiAssistantService {
  private agent: AgentExecutor;
  private model: ChatOllama;
  private readonly logger = new Logger(AiAssistantService.name);

  constructor(
    private readonly sheetsService: GoogleSheetsService,
    // private readonly notionService: NotionService,
  ) {
    this.initializeAgent().catch((err) => {
      this.logger.error('Failed to initialize AI agent:', err);
    });
  }

  private async initializeAgent() {
    this.model = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'qwen2.5:3b',
    });
    this.logger.log('Ollama model initialized successfully');

    const tools = [
      new DynamicStructuredTool({
        name: 'addMaintenanceCost',
        description: 'Add a maintenance cost for a property',
        schema: z.object({
          amount: z.number().describe('Cost amount'),
          description: z.string().describe('Description of the maintenance'),
          property: z.string().describe('Property identifier'),
        }),
        async func({ amount, description, property }) {
          // Implementation to add maintenance cost
          return `Added ${amount} for ${description} at ${property}`;
        },
      }),

      new DynamicStructuredTool({
        name: 'queryOwedAmount',
        description: 'Query how much money is owed to a person',
        schema: z.object({
          person: z.string().describe('Name of the person'),
        }),
        async func({ person }) {
          // Implementation to query owed amount
          const amount = await this.sheetsService.getOwedAmount(person);
          return `You owe ${person} ${amount}`;
        },
      }),

      new DynamicStructuredTool({
        name: 'getPropertyCosts',
        description: 'Get maintenance costs for a property',
        schema: z.object({
          property: z.string().describe('Property identifier'),
          timeframe: z.string().describe('Time period for the query'),
        }),
        async func({ property, timeframe }) {
          // Implementation to get property costs
          const costs = await this.sheetsService.getPropertyCosts(
            property,
            timeframe,
          );
          return `Maintenance costs for ${property}: ${costs}`;
        },
      }),
    ];

    const prompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        `You are a helpful property management assistant.
You can:
- Add maintenance costs
- Query money owed to people
- Get property maintenance costs
- Record capex expenses

Always confirm the details before executing any action.`,
      ],
      ['human', '{input}'],
      new MessagesPlaceholder('agent_scratchpad'),
    ]);
    try {
      const agent = await createOpenAIFunctionsAgent({
        llm: this.model,
        tools,
        prompt,
      });
      this.logger.log('AI agent initialized successfully');

      this.agent = AgentExecutor.fromAgentAndTools({
        agent,
        tools,
        // verbose: true,
      });
    } catch (error) {
      this.logger.error('Failed to initialize AI agent:', error);
      this.logger.error(error.stack);

      throw error;
    }
  }
  async processMessage(message: string): Promise<string> {
    if (!this.agent) {
      this.logger.error('AI agent not initialized');
      return 'Sorry, the AI service is not ready yet. Please try again in a moment.';
    }

    try {
      this.logger.debug('Processing message with AI:', { message });
      const result = await this.agent.invoke({
        input: message,
      });
      this.logger.debug('AI processing result:', { result });

      return result.output;
    } catch (error) {
      this.logger.error('Error processing message:', error);
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  }
}
