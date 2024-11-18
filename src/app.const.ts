export const TELEGRAM_COMMANDS = 'TELEGRAM_COMMANDS';
export const TELEGRAM_BOT_COMMANDS = [
  {
    command: 'help',
    description: 'show available commands',
    role: 'guest',
  },
  {
    command: 'record_payment',
    description: 'record payment for sai-finance',
    role: 'admin',
  },
  {
    command: 'file',
    description: 'handle file uploads and downloads',
    role: 'guest',
  },
] as const;

export const generateHelpMessage = (userRole: string = 'guest') => {
  const commandList = TELEGRAM_BOT_COMMANDS.map((cmd) => {
    const roleIndicator = cmd.role === 'admin' ? ' 👑' : '';
    return `/${cmd.command} - ${cmd.description}${roleIndicator}`;
  }).join('\n');

  return `
🤖 JARVIS Help Menu
👤 Your Role: ${userRole.toUpperCase()}

Available Commands:
${commandList}

Note: Commands marked with 👑 require admin privileges.
`;
};
