import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

export interface ActionDefinition {
  name: string;
  description: string;
  parameters: {
    [key: string]: {
      type: string;
      description: string;
      required: boolean;
    };
  };
  handler: (params: any) => Promise<any>;
}

@Injectable()
export class ActionRegistryService {
  private actions: Map<string, ActionDefinition> = new Map();

  constructor(
    @InjectPinoLogger(ActionRegistryService.name)
    private readonly logger: PinoLogger,
  ) {}

  registerAction(action: ActionDefinition) {
    this.actions.set(action.name, action);
    this.logger.debug(`Registered action: ${action.name}`);
  }

  getActions(): ActionDefinition[] {
    return Array.from(this.actions.values());
  }

  getAction(name: string): ActionDefinition | undefined {
    return this.actions.get(name);
  }

  getActionSchema(): string {
    const actions = this.getActions();
    return actions
      .map(
        (action) => `
Action: ${action.name}
Description: ${action.description}
Parameters: ${Object.entries(action.parameters)
          .map(
            ([name, param]) =>
              `\n  - ${name} (${param.type}${
                param.required ? ', required' : ''
              }): ${param.description}`,
          )
          .join('')}
`,
      )
      .join('\n');
  }
}
