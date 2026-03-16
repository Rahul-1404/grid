import { Command } from 'commander';
import chalk from 'chalk';
import { GridAgent } from './client';
import { Bridge } from './bridge';
import { getPreset, listPresets, PRESETS } from './presets';
import * as readline from 'readline';
import * as https from 'https';
import * as http from 'http';

const DEFAULT_BACKEND = 'https://grid-backend-production.up.railway.app';

interface JoinCodeResponse {
  token: string;
  url: string;
  workspaceId?: string;
  agentName: string;
  agentId: string;
  capabilities: string[];
}

function resolveJoinCode(code: string, backendUrl: string): Promise<JoinCodeResponse> {
  return new Promise((resolve, reject) => {
    const url = `${backendUrl}/api/agent-codes/${encodeURIComponent(code)}`;
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, (res) => {
      let data = '';
      res.on('data', (chunk: string) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) {
          try {
            const err = JSON.parse(data);
            reject(new Error(err.error || `HTTP ${res.statusCode}`));
          } catch {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
          return;
        }
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Invalid response from server')); }
      });
    }).on('error', reject);
  });
}

const program = new Command();

program
  .name('grid-agent')
  .description('Connect any AI agent to Grid — the collaborative workspace for humans and agents')
  .version('0.3.1');

// List command
program
  .command('list')
  .description('List all available agent presets')
  .action(() => {
    console.log(chalk.bold.cyan('\n  Available Agent Presets\n'));
    const maxName = Math.max(...Object.values(PRESETS).map(p => p.name.length));
    for (const [key, preset] of Object.entries(PRESETS)) {
      const caps = preset.capabilities.length ? chalk.gray(preset.capabilities.join(', ')) : chalk.gray('--');
      const cmd = preset.command ? `${preset.command} ${preset.args.join(' ')}`.trim() : chalk.gray('(custom)');
      console.log(
        `  ${chalk.yellow(key.padEnd(12))} ${chalk.white(preset.name.padEnd(maxName + 2))} ${chalk.gray('cmd=')}${cmd}  ${chalk.gray('caps=')}${caps}`
      );
    }
    console.log(chalk.gray(`\n  Usage: grid-agent bridge <preset> --token YOUR_TOKEN`));
    console.log(chalk.gray(`  Custom: grid-agent bridge "my-command --flag" --token YOUR_TOKEN\n`));
  });

// Default connect command (backward compatible)
program
  .command('connect', { isDefault: true })
  .description('Connect an agent to Grid via WebSocket')
  .option('-n, --name <name>', 'Agent name', 'My Agent')
  .option('-u, --url <url>', 'Grid WebSocket URL', 'wss://grid-backend-production.up.railway.app/agent')
  .option('-t, --token <token>', 'Pre-registered agent token')
  .option('-c, --capabilities <caps>', 'Comma-separated capabilities', '')
  .option('-w, --workspace <id>', 'Workspace ID to scope agent to')
  .option('-i, --interactive', 'Interactive mode - prompt for replies to mentions')
  .action((opts) => {
    const capabilities = opts.capabilities
      ? opts.capabilities.split(',').map((c: string) => c.trim()).filter(Boolean)
      : [];

    console.log(chalk.bold.cyan('\n  Grid Agent Connector\n'));
    console.log(chalk.gray('  Name:         ') + chalk.white(opts.name));
    console.log(chalk.gray('  URL:          ') + chalk.white(opts.url));
    if (capabilities.length) {
      console.log(chalk.gray('  Capabilities: ') + chalk.white(capabilities.join(', ')));
    }
    if (opts.token) {
      console.log(chalk.gray('  Token:        ') + chalk.white(opts.token.slice(0, 8) + '...'));
    }
    if (opts.workspace) {
      console.log(chalk.gray('  Workspace:    ') + chalk.white(opts.workspace));
    }
    console.log(chalk.gray('  Mode:         ') + chalk.white(opts.interactive ? 'Interactive' : 'Auto-reply'));
    console.log('');

    const agent = new GridAgent({
      name: opts.name,
      url: opts.url,
      token: opts.token,
      capabilities,
      workspaceId: opts.workspace,
    });

    let rl: readline.Interface | null = null;

    agent.on('connected', (data) => {
      console.log(chalk.green.bold('  [CONNECTED]') + ' Agent is online!');
      if (data.token) {
        console.log(chalk.gray('  Token: ') + chalk.yellow(data.token));
      }
      if (data.agentId) {
        console.log(chalk.gray('  ID:    ') + chalk.yellow(data.agentId));
      }
      console.log(chalk.gray('\n  Listening for @mentions...\n'));
    });

    agent.on('disconnected', ({ code }) => {
      console.log(chalk.red('  [DISCONNECTED]') + chalk.gray(` code=${code}`));
    });

    agent.on('mention', async (data) => {
      console.log(chalk.magenta.bold('  [@MENTION]') + ` from ${chalk.cyan(data.author)} in doc ${chalk.gray(data.docId)}`);
      console.log(chalk.gray('  > ') + data.text);

      if (opts.interactive && rl) {
        const answer = await new Promise<string>((resolve) => {
          rl!.question(chalk.yellow('  Reply: '), resolve);
        });
        if (answer.trim()) {
          agent.reply(data.commentId, answer.trim());
          console.log(chalk.green('  [SENT]') + ' Reply delivered\n');
        }
      } else {
        agent.reply(data.commentId, 'Agent connected but no handler configured. Set up a mention handler to respond.');
        console.log(chalk.gray('  [AUTO-REPLY] Default response sent\n'));
      }
    });

    agent.on('message', (msg) => {
      if (msg.type === 'reconnecting') {
        console.log(chalk.yellow(`  [RECONNECTING] Attempt ${msg.attempt}...`));
        return;
      }
      console.log(chalk.blue('  [MSG]') + ' ' + JSON.stringify(msg));
    });

    agent.on('error', (err) => {
      console.log(chalk.red('  [ERROR]') + ' ' + (err instanceof Error ? err.message : String(err)));
    });

    if (opts.interactive) {
      rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    }

    const shutdown = () => {
      console.log(chalk.gray('\n  Disconnecting...'));
      agent.disconnect();
      if (rl) rl.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    console.log(chalk.gray('  Connecting...'));
    agent.connect();
  });

// Bridge command
program
  .command('bridge <agent>')
  .description('Bridge a local AI CLI to Grid (supports: ' + listPresets().join(', ') + ')')
  .option('-t, --token <token>', 'Agent connection token (required unless --join)', '')
  .option('-j, --join <code>', 'Join code for one-command connect')
  .option('-n, --name <name>', 'Agent display name')
  .option('-u, --url <url>', 'Grid WebSocket URL', 'wss://grid-backend-production.up.railway.app/agent')
  .option('-w, --workspace <id>', 'Workspace ID')
  .option('-s, --stdin', 'Pass prompt via stdin instead of as an argument')
  .option('--timeout <ms>', 'Timeout in milliseconds for agent responses', '120000')
  .option('-l, --list', 'List available presets and exit')
  .option('--backend <url>', 'Backend URL for resolving join codes', DEFAULT_BACKEND)
  .addHelpText('after', `
Presets: ${listPresets().join(', ')}

Examples:
  $ grid-agent bridge claude --join abc123
  $ grid-agent bridge claude --token YOUR_TOKEN
  $ grid-agent bridge codex --token YOUR_TOKEN
  $ grid-agent bridge gemini --token YOUR_TOKEN
  $ grid-agent bridge goose --token YOUR_TOKEN
  $ grid-agent bridge aider --token YOUR_TOKEN
  $ grid-agent bridge "python my_agent.py" --token YOUR_TOKEN
  $ grid-agent bridge "my-agent" --token YOUR_TOKEN --stdin
  $ grid-agent bridge claude --token YOUR_TOKEN --timeout 300000
  `)
  .action(async (agentArg: string, opts) => {
    if (opts.list) {
      console.log(chalk.bold.cyan('\n  Available Presets\n'));
      for (const [key, preset] of Object.entries(PRESETS)) {
        const cmd = preset.command ? `${preset.command} ${preset.args.join(' ')}`.trim() : '(custom)';
        console.log(`  ${chalk.yellow(key.padEnd(12))} ${chalk.white(preset.name.padEnd(18))} ${chalk.gray(cmd)}`);
      }
      console.log('');
      return;
    }

    // Resolve join code if provided
    if (opts.join) {
      console.log(chalk.gray(`\n  Resolving join code ${chalk.cyan(opts.join)}...`));
      try {
        const resolved = await resolveJoinCode(opts.join, opts.backend || DEFAULT_BACKEND);
        opts.token = resolved.token;
        opts.url = resolved.url;
        if (resolved.workspaceId) opts.workspace = resolved.workspaceId;
        if (!opts.name && resolved.agentName) opts.name = resolved.agentName;
        console.log(chalk.green('  Join code resolved!') + chalk.gray(` agent=${resolved.agentName}`));
      } catch (err: any) {
        console.log(chalk.red(`\n  Error: Failed to resolve join code "${opts.join}"`));
        console.log(chalk.gray(`  ${err.message}\n`));
        process.exit(1);
      }
    }

    if (!opts.token) {
      console.log(chalk.red('\n  Error: --token or --join is required for bridge mode.'));
      console.log(chalk.gray('  Register an agent at https://grid-editor.vercel.app to get a token.\n'));
      process.exit(1);
    }

    const preset = getPreset(agentArg);
    let command: string;
    let args: string[];
    let name: string;
    let capabilities: string[];
    let installHint: string | undefined;

    if (preset) {
      command = preset.command;
      args = preset.args;
      name = opts.name || preset.name;
      capabilities = preset.capabilities;
      installHint = preset.installHint;
    } else {
      // Custom command -- split on spaces
      const parts = agentArg.split(/\s+/);
      command = parts[0];
      args = parts.slice(1);
      name = opts.name || command;
      capabilities = ['code'];
    }

    const bridge = new Bridge({
      command,
      args,
      name,
      capabilities,
      token: opts.token,
      url: opts.url,
      workspaceId: opts.workspace,
      useStdin: opts.stdin || false,
      timeout: parseInt(opts.timeout, 10) || 120000,
      installHint,
    });

    const shutdown = () => {
      bridge.stop();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    bridge.start();
  });

// Join command — resolve code and auto-detect agent
program
  .command('join <code>')
  .description('Join a Grid workspace with a short code (auto-detects installed agents)')
  .option('--backend <url>', 'Backend URL for resolving join codes', DEFAULT_BACKEND)
  .option('--timeout <ms>', 'Timeout in milliseconds for agent responses', '120000')
  .action(async (code: string, opts) => {
    console.log(chalk.bold.cyan('\n  Grid Agent — Join\n'));
    console.log(chalk.gray(`  Resolving join code ${chalk.cyan(code)}...`));

    let resolved: JoinCodeResponse;
    try {
      resolved = await resolveJoinCode(code, opts.backend || DEFAULT_BACKEND);
    } catch (err: any) {
      console.log(chalk.red(`\n  Error: Invalid or expired join code "${code}"`));
      console.log(chalk.gray(`  ${err.message}\n`));
      process.exit(1);
      return; // for TS
    }

    console.log(chalk.green('  Code resolved!'));
    console.log(chalk.gray('  Agent: ') + chalk.white(resolved.agentName));
    if (resolved.workspaceId) {
      console.log(chalk.gray('  Workspace: ') + chalk.white(resolved.workspaceId));
    }

    // Detect installed agent CLIs
    const { execSync } = await import('child_process');
    const agentClis = ['claude', 'codex', 'gemini', 'goose', 'aider', 'kiro'];
    const installed: string[] = [];
    for (const cli of agentClis) {
      try {
        execSync(`which ${cli}`, { stdio: 'ignore' });
        installed.push(cli);
      } catch {}
    }

    let agentChoice: string;
    if (installed.length === 0) {
      console.log(chalk.yellow('\n  No known agent CLIs found in PATH.'));
      console.log(chalk.gray('  Install one of: claude, codex, gemini, goose, aider, kiro'));
      console.log(chalk.gray(`  Then run: grid-agent bridge <agent> --join ${code}\n`));
      process.exit(1);
      return;
    } else if (installed.length === 1) {
      agentChoice = installed[0];
      console.log(chalk.gray('  Detected agent: ') + chalk.cyan(agentChoice));
    } else {
      console.log(chalk.gray('\n  Detected agents: ') + chalk.cyan(installed.join(', ')));
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      agentChoice = await new Promise<string>((resolve) => {
        rl.question(chalk.yellow(`  Which agent to bridge? [${installed[0]}]: `), (answer) => {
          rl.close();
          resolve(answer.trim() || installed[0]);
        });
      });
      if (!installed.includes(agentChoice)) {
        console.log(chalk.red(`  "${agentChoice}" not found. Available: ${installed.join(', ')}\n`));
        process.exit(1);
        return;
      }
    }

    console.log(chalk.gray(`\n  Starting bridge with ${chalk.cyan(agentChoice)}...\n`));

    const preset = getPreset(agentChoice);
    const command = preset ? preset.command : agentChoice;
    const args = preset ? preset.args : [];
    const name = resolved.agentName || (preset ? preset.name : agentChoice);
    const capabilities = resolved.capabilities.length ? resolved.capabilities : (preset ? preset.capabilities : ['code']);

    const bridge = new Bridge({
      command,
      args,
      name,
      capabilities,
      token: resolved.token,
      url: resolved.url,
      workspaceId: resolved.workspaceId,
      useStdin: false,
      timeout: parseInt(opts.timeout, 10) || 120000,
      installHint: preset?.installHint,
    });

    const shutdown = () => {
      bridge.stop();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

    bridge.start();
  });

program.parse(process.argv);
