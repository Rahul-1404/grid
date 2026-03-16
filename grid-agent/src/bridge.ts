import { spawn, ChildProcess } from 'child_process';
import chalk from 'chalk';
import { GridAgent } from './client';
import { AgentPreset } from './presets';

// Strip ANSI escape codes from a string
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
}

export interface BridgeOptions {
  command: string;
  args: string[];
  name: string;
  capabilities: string[];
  token: string;
  url: string;
  workspaceId?: string;
  useStdin?: boolean;
  timeout?: number;
  installHint?: string;
}

export class Bridge {
  private proc: ChildProcess | null = null;
  private agent: GridAgent;
  private options: BridgeOptions;
  private shuttingDown = false;
  private restartCount = 0;
  private maxRestarts = 5;
  private timeout: number;

  constructor(opts: BridgeOptions) {
    this.options = opts;
    this.timeout = opts.timeout || 120000;
    this.agent = new GridAgent({
      name: opts.name,
      url: opts.url,
      token: opts.token,
      capabilities: opts.capabilities,
      workspaceId: opts.workspaceId,
    });
  }

  start(): void {
    this.printHeader();
    this.setupGridHandlers();
    // Don't spawn process at startup — we run one-shot per mention
    this.agent.connect();
  }

  stop(): void {
    this.shuttingDown = true;
    console.log(chalk.gray('\n  Shutting down bridge...'));
    this.agent.disconnect();
    this.killProcess();
  }

  private printHeader(): void {
    console.log(chalk.bold.cyan('\n  Grid Bridge\n'));
    console.log(chalk.gray('  Agent:   ') + chalk.white(this.options.name));
    console.log(chalk.gray('  Command: ') + chalk.white(`${this.options.command} ${this.options.args.join(' ')}`));
    console.log(chalk.gray('  Mode:    ') + chalk.white(this.options.useStdin ? 'stdin' : 'argument'));
    console.log(chalk.gray('  Timeout: ') + chalk.white(`${this.timeout / 1000}s`));
    console.log(chalk.gray('  URL:     ') + chalk.white(this.options.url));
    console.log(chalk.gray('  Token:   ') + chalk.white(this.options.token.slice(0, 8) + '...'));
    console.log('');
  }

  private setupGridHandlers(): void {
    this.agent.on('connected', (data) => {
      console.log(chalk.green.bold('  [CONNECTED]') + ' Bridge is online!');
      if (data.agentId) {
        console.log(chalk.gray('  Agent ID: ') + chalk.yellow(data.agentId));
      }
      console.log(chalk.gray('\n  Listening for @mentions...\n'));
    });

    this.agent.on('disconnected', ({ code }) => {
      console.log(chalk.red('  [DISCONNECTED]') + chalk.gray(` code=${code}`));
    });

    this.agent.on('mention', async (data) => {
      console.log(chalk.magenta.bold('  [@MENTION]') + ` from ${chalk.cyan(data.author)} in doc ${chalk.gray(data.docId)}`);
      console.log(chalk.gray('  > ') + data.text);
      console.log(chalk.yellow('  [PROCESSING]') + ' Sending to ' + this.options.name + '...');

      try {
        const response = await this.sendToProcess(data.text);
        const trimmed = stripAnsi(response.trim());
        if (trimmed) {
          this.agent.reply(data.commentId, trimmed);
          console.log(chalk.green('  [REPLIED]') + ' ' + trimmed.slice(0, 80) + (trimmed.length > 80 ? '...' : ''));
        } else {
          this.agent.reply(data.commentId, 'Agent returned an empty response.');
          console.log(chalk.yellow('  [EMPTY]') + ' Agent returned empty response');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.agent.reply(data.commentId, `Error: ${msg}`);
        console.log(chalk.red('  [ERROR]') + ' ' + msg);
      }
      console.log('');
    });

    this.agent.on('message', (msg) => {
      if (msg.type === 'reconnecting') {
        console.log(chalk.yellow(`  [RECONNECTING] Attempt ${msg.attempt}...`));
      }
    });

    this.agent.on('error', (err) => {
      console.log(chalk.red('  [ERROR]') + ' ' + (err instanceof Error ? err.message : String(err)));
    });
  }

  private spawnProcess(): void {
    console.log(chalk.gray(`  Spawning: ${this.options.command} ${this.options.args.join(' ')}`));

    try {
      this.proc = spawn(this.options.command, this.options.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env },
      });
    } catch (err) {
      console.log(chalk.red('  [SPAWN ERROR]') + ' Failed to spawn process');
      this.printInstallHint();
      return;
    }

    this.proc.on('error', (err) => {
      console.log(chalk.red('  [PROCESS ERROR]') + ' ' + err.message);
      this.printInstallHint();
    });

    this.proc.on('close', (code) => {
      console.log(chalk.yellow(`  [PROCESS EXIT]`) + ` code=${code}`);
      this.proc = null;
      if (!this.shuttingDown && this.restartCount < this.maxRestarts) {
        this.restartCount++;
        console.log(chalk.yellow(`  [RESTARTING]`) + ` Attempt ${this.restartCount}/${this.maxRestarts}...`);
        setTimeout(() => this.spawnProcess(), 2000);
      }
    });

    if (this.proc.stderr) {
      this.proc.stderr.on('data', (data: Buffer) => {
        const text = data.toString().trim();
        if (text) {
          console.log(chalk.gray('  [stderr] ') + text.slice(0, 200));
        }
      });
    }

    console.log(chalk.green('  [SPAWNED]') + ` PID ${this.proc.pid}\n`);
  }

  private printInstallHint(): void {
    if (this.options.installHint) {
      console.log(chalk.yellow(`  ${this.options.command} is not installed. Install it with:`));
      console.log(chalk.white(`    ${this.options.installHint}`));
    } else {
      console.log(chalk.gray(`  Make sure '${this.options.command}' is installed and in your PATH`));
    }
  }

  private sendToProcess(text: string): Promise<string> {
    return this.runOneShot(text);
  }

  private runOneShot(text: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const useStdin = this.options.useStdin || false;
      const argsWithPrompt = useStdin ? [...this.options.args] : [...this.options.args, text];

      let proc: ChildProcess;
      try {
        proc = spawn(this.options.command, argsWithPrompt, {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env },
        });
      } catch (err) {
        this.printInstallHint();
        reject(new Error(`Failed to run ${this.options.command}: ${err instanceof Error ? err.message : String(err)}`));
        return;
      }

      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeout = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        resolve(stdout || `Response timed out after ${this.timeout / 1000}s`);
      }, this.timeout);

      proc.stdout!.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr!.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        this.printInstallHint();
        reject(new Error(`Failed to run ${this.options.command}: ${err.message}`));
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (timedOut) return;
        if (code !== 0 && !stdout.trim()) {
          reject(new Error(`Process exited with code ${code}: ${stderr.slice(0, 200)}`));
        } else {
          resolve(stdout);
        }
      });

      // Write the prompt to stdin for stdin-mode agents
      if (useStdin) {
        proc.stdin!.write(text);
      }
      proc.stdin!.end();
    });
  }

  private killProcess(): void {
    if (this.proc) {
      this.proc.kill('SIGTERM');
      setTimeout(() => {
        if (this.proc) {
          this.proc.kill('SIGKILL');
        }
      }, 3000);
    }
  }
}
