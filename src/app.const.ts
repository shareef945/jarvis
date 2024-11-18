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
    command: 'record_maintenance_cost',
    description: 'record maintenance cost for sai-real estate',
    role: 'admin',
  },
  {
    command: 'record_capex',
    description: 'record capex for sai-real estate',
    role: 'admin',
  },
  {
    command: 'record_airbnb_revenue',
    description: 'record airbnb revenue',
    role: 'admin',
  },
  {
    command: 'record_airbnb_payout',
    description: 'record airbnb payout',
    role: 'admin',
  },
  {
    command: 'record_money_lent',
    description: 'record money lent out',
    role: 'admin',
  },
  {
    command: 'record_money_received',
    description: 'record money received from loan',
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
♻️ JARVIS Help Menu
👤 Your Role: ${userRole.toUpperCase()}

Available Commands:
${commandList}

Note: Commands marked with 👑 require admin privileges.
`;
};
