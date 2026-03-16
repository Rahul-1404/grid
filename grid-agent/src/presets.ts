export interface AgentPreset {
  command: string;
  args: string[];
  name: string;
  capabilities: string[];
  stdin?: boolean;
  installHint?: string;
}

export const PRESETS: Record<string, AgentPreset> = {
  // Anthropic
  claude: {
    command: 'claude',
    args: ['-p'],
    name: 'Claude Code',
    capabilities: ['code', 'writing', 'analysis'],
    installHint: 'npm install -g @anthropic-ai/claude-code',
  },

  // OpenAI
  codex: {
    command: 'codex',
    args: ['exec'],
    name: 'Codex',
    capabilities: ['code', 'debugging', 'research'],
    installHint: 'npm install -g @openai/codex',
  },

  // OpenClaw
  openclaw: {
    command: 'openclaw',
    args: ['agent', '-m'],
    name: 'OpenClaw',
    capabilities: ['code', 'writing', 'analysis'],
    installHint: 'npm install -g openclaw',
  },

  // Amazon
  kiro: {
    command: 'kiro',
    args: ['--prompt'],
    name: 'Kiro',
    capabilities: ['code', 'writing'],
    installHint: 'npm install -g @amazon/kiro',
  },

  // Google
  gemini: {
    command: 'gemini',
    args: ['prompt'],
    name: 'Gemini CLI',
    capabilities: ['code', 'research', 'analysis'],
    installHint: 'npm install -g @anthropic-ai/gemini-cli  # or: brew install gemini',
  },

  // Cursor
  cursor: {
    command: 'cursor',
    args: ['--pipe'],
    name: 'Cursor',
    capabilities: ['code', 'writing', 'analysis'],
    installHint: 'Download from https://cursor.com',
  },

  // Goose (Block)
  goose: {
    command: 'goose',
    args: ['run', '--text'],
    name: 'Goose',
    capabilities: ['code', 'writing'],
    installHint: 'brew install block/goose/goose  # or: pip install goose-ai',
  },

  // Aider
  aider: {
    command: 'aider',
    args: ['--message'],
    name: 'Aider',
    capabilities: ['code', 'writing'],
    installHint: 'pip install aider-chat',
  },

  // Continue.dev
  continue: {
    command: 'continue',
    args: ['--prompt'],
    name: 'Continue',
    capabilities: ['code', 'analysis'],
    installHint: 'npm install -g @continue/cli',
  },

  // Devin (Cognition)
  devin: {
    command: 'devin',
    args: ['run'],
    name: 'Devin',
    capabilities: ['code', 'debugging', 'research'],
    installHint: 'See https://devin.ai for access',
  },

  // Sweep
  sweep: {
    command: 'sweep',
    args: ['run'],
    name: 'Sweep',
    capabilities: ['code', 'debugging'],
    installHint: 'pip install sweepai',
  },

  // Generic -- for any CLI that accepts prompt as last arg
  generic: {
    command: '',
    args: [],
    name: 'Custom Agent',
    capabilities: [],
  },

  // Bash -- just runs shell commands
  bash: {
    command: 'bash',
    args: ['-c'],
    name: 'Bash',
    capabilities: ['code'],
  },

  // Python -- runs a Python script
  python: {
    command: 'python3',
    args: ['-c'],
    name: 'Python',
    capabilities: ['code', 'analysis'],
  },

  // HTTP -- calls a webhook URL
  http: {
    command: 'curl',
    args: ['-s', '-X', 'POST', '-d'],
    name: 'HTTP Webhook',
    capabilities: [],
  },
};

export function getPreset(name: string): AgentPreset | undefined {
  return PRESETS[name.toLowerCase()];
}

export function listPresets(): string[] {
  return Object.keys(PRESETS);
}
