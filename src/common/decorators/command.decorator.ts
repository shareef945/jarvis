export const COMMAND_METADATA = 'telegram:command';

export interface CommandMetadata {
  name: string;
  description: string;
  usage?: string;
}

export const Command = (metadata: CommandMetadata): ClassDecorator => {
  return (target: any) => {
    Reflect.defineMetadata(COMMAND_METADATA, metadata, target);
    return target;
  };
};
