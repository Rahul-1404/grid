import { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useAgentStore } from '../../stores/agentStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { IconX, IconCopy, IconCheck, IconTerminal } from '../../lib/icons';

type Tab = 'quick' | 'websocket' | 'cli';

const QUICK_AGENTS = [
  { name: 'Claude Code', icon: '\uD83E\uDDE0', caps: ['writing', 'code', 'analysis', 'debugging'], desc: 'Anthropic\'s coding agent' },
  { name: 'Codex', icon: '\u26A1', caps: ['code', 'debugging', 'research'], desc: 'OpenAI\'s code agent' },
  { name: 'Cursor', icon: '\uD83C\uDFAF', caps: ['code', 'writing', 'analysis'], desc: 'AI-powered editor agent' },
];

const CAPABILITY_OPTIONS = ['writing', 'code', 'research', 'analysis', 'debugging', 'summarization'];

const WS_BASE = 'wss://grid-backend-production.up.railway.app';
const API_BASE = 'https://grid-backend-production.up.railway.app';

export default function AddAgentModal() {
  const { setShowAddAgentModal } = useEditorStore();
  const { connectAgent } = useAgentStore();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const [tab, setTab] = useState<Tab>('quick');
  const [name, setName] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [selectedCaps, setSelectedCaps] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [result, setResult] = useState<{ id: string; token: string; wsUrl: string } | null>(null);
  const [error, setError] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);

  const copyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleCap = (cap: string) => {
    setSelectedCaps((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  const handleConnect = async (agentName: string, caps: string[]) => {
    if (!agentName.trim()) return;
    setStatus('connecting');
    setError('');
    try {
      const data = await connectAgent(agentName.trim(), caps);
      if (!data || !data.id) throw new Error('Invalid response from backend');
      setResult(data);
      setStatus('connected');

      // Create a join code for one-command connect
      try {
        const codeRes = await fetch(`${API_BASE}/api/agent-codes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agentName: agentName.trim(),
            capabilities: caps,
            workspaceId: currentWorkspaceId,
          }),
        });
        if (codeRes.ok) {
          const codeData = await codeRes.json();
          setJoinCode(codeData.code);
        }
      } catch {
        // Join code is optional — don't fail the flow
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect. Is the backend running?');
      setStatus('error');
    }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'quick', label: 'Quick Connect', icon: <span className="text-sm">&#9889;</span> },
    { id: 'websocket', label: 'WebSocket', icon: <span className="text-sm">&#128268;</span> },
    { id: 'cli', label: 'CLI Bridge', icon: <IconTerminal className="w-3.5 h-3.5" /> },
  ];

  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'fail'>('idle');

  const handleTestConnection = async () => {
    if (!result) return;
    setTestStatus('testing');
    try {
      const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const res = await fetch(`${backendUrl}/api/agents`);
      if (!res.ok) throw new Error('Backend unreachable');
      const agents = await res.json();
      const found = Array.isArray(agents) && agents.some((a: any) => a.id === result.id && a.status === 'ONLINE');
      setTestStatus(found ? 'success' : 'fail');
    } catch {
      setTestStatus('fail');
    }
    setTimeout(() => setTestStatus('idle'), 4000);
  };

  // Success state
  if (status === 'connected' && result) {
    const agentWsUrl = `${WS_BASE}/agent`;
    const wsFlag = currentWorkspaceId ? ` --workspace ${currentWorkspaceId}` : '';
    const cliCommand = `npx @ollielabs/grid-agent --token ${result.token} --url ${agentWsUrl}${wsFlag}`;
    const sdkCommand = `npx @ollielabs/grid-agent --name "Claude Code" --token ${result.token}${wsFlag}`;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddAgentModal(false)}>
        <div className="bg-surface border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-text-primary">Agent Connected</h2>
            <button onClick={() => setShowAddAgentModal(false)} className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors">
              <IconX className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-online/10 border border-online/25 rounded-lg p-4 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-online animate-pulse" />
              <span className="text-sm font-medium text-online">Agent registered successfully</span>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Agent ID</span>
                <p className="text-sm text-text-primary font-mono mt-0.5">{result.id}</p>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-text-tertiary uppercase tracking-wider">Connection Token</span>
                  <button onClick={() => copyText(result.token, 'token')} className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                    {copiedField === 'token' ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
                <p className="text-sm text-text-primary font-mono break-all mt-0.5 bg-bg/50 rounded px-2 py-1.5 select-all">{result.token}</p>
              </div>
            </div>
          </div>

          {/* Join code — ONE command connect */}
          {joinCode && (
            <div className="bg-agent/5 border-2 border-agent/30 rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <IconTerminal className="w-4 h-4 text-agent" />
                  <span className="text-sm font-semibold text-text-primary">Connect with ONE command</span>
                </div>
                <button onClick={() => copyText(`grid-agent bridge claude --join ${joinCode}`, 'joincode')} className="px-3 py-1.5 rounded-lg bg-agent text-white text-xs font-medium hover:bg-agent-hover transition-colors flex items-center gap-1.5">
                  {copiedField === 'joincode' ? <><IconCheck className="w-3.5 h-3.5" /> Copied!</> : <><IconCopy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
              <pre className="text-sm text-agent font-mono font-bold bg-surface rounded-lg px-4 py-3 overflow-x-auto whitespace-pre-wrap break-all">{`grid-agent bridge claude --join ${joinCode}`}</pre>
              <p className="text-[10px] text-text-tertiary mt-2">Replace <code className="text-agent">claude</code> with <code className="text-agent">codex</code>, <code className="text-agent">kiro</code>, <code className="text-agent">gemini</code>, or any command. Code expires in 7 days.</p>
              <p className="text-[10px] text-text-tertiary mt-1">Don't have grid-agent? Run: <code className="text-agent">npm install -g @ollielabs/grid-agent</code></p>
            </div>
          )}

          {/* Bridge command — connect a real AI CLI (fallback with full token) */}
          <div className="bg-bg border border-border rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <IconTerminal className="w-3.5 h-3.5 text-agent" />
                <span className="text-xs font-medium text-text-secondary">{joinCode ? 'Or use full token' : 'Bridge your AI CLI to Grid'}</span>
              </div>
              <button onClick={() => copyText(`npm install -g @ollielabs/grid-agent && grid-agent bridge claude --token ${result.token} --url ${agentWsUrl}${wsFlag}`, 'bridge')} className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                {copiedField === 'bridge' ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <pre className="text-xs text-agent font-mono bg-surface rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">{`npm install -g @ollielabs/grid-agent\ngrid-agent bridge claude --token ${result.token} --url ${agentWsUrl}${wsFlag}`}</pre>
            <p className="text-[10px] text-text-tertiary mt-2">Replace <code className="text-agent">claude</code> with <code className="text-agent">codex</code>, <code className="text-agent">kiro</code>, <code className="text-agent">gemini</code>, or any command.</p>
          </div>

          {/* CLI command */}
          <div className="bg-bg border border-border rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <IconTerminal className="w-3.5 h-3.5 text-agent" />
                <span className="text-xs font-medium text-text-secondary">Or connect directly</span>
              </div>
              <button onClick={() => copyText(cliCommand, 'cli')} className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                {copiedField === 'cli' ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <pre className="text-xs text-agent font-mono bg-surface rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">{cliCommand}</pre>
          </div>

          {/* SDK snippet */}
          <div className="bg-bg border border-border rounded-lg p-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-text-secondary">Or use the SDK:</span>
              <button onClick={() => copyText(`const agent = new GridAgent({ name: 'My Bot', token: '${result.token}'${currentWorkspaceId ? `, workspaceId: '${currentWorkspaceId}'` : ''} });\nagent.on('mention', (d) => agent.reply(d.commentId, 'Hello!'));\nagent.connect();`, 'sdk')} className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                {copiedField === 'sdk' ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
              </button>
            </div>
            <pre className="text-xs text-agent font-mono bg-surface rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">{`import { GridAgent } from '@ollielabs/grid-agent';

const agent = new GridAgent({
  name: 'My Bot',
  token: '${result.token}',${currentWorkspaceId ? `\n  workspaceId: '${currentWorkspaceId}',` : ''}
});
agent.on('mention', (d) => agent.reply(d.commentId, 'Hello!'));
agent.connect();`}</pre>
          </div>

          <p className="text-xs text-text-tertiary mb-4">
            Your agent will appear in the sidebar once connected. You can @mention it in comments to interact.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing'}
              className={`flex-1 py-2.5 rounded-lg font-medium text-sm transition-colors border ${
                testStatus === 'success'
                  ? 'border-green-500/30 bg-green-500/10 text-green-400'
                  : testStatus === 'fail'
                  ? 'border-red-500/30 bg-red-500/10 text-red-400'
                  : 'border-border bg-surface text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? 'Connected!' : testStatus === 'fail' ? 'Not connected yet' : 'Test Connection'}
            </button>
            <button
              onClick={() => setShowAddAgentModal(false)}
              className="flex-1 py-2.5 rounded-lg bg-agent text-white font-medium text-sm hover:bg-agent-hover transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowAddAgentModal(false)}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-text-primary">Add Agent</h2>
          <button onClick={() => setShowAddAgentModal(false)} className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors">
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border mb-5">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors relative ${
                tab === t.id ? 'text-accent' : 'text-text-tertiary hover:text-text-secondary'
              }`}
            >
              {t.icon}
              {t.label}
              {tab === t.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full" />}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        )}

        {/* Quick Connect tab */}
        {tab === 'quick' && (
          <div className="space-y-3">
            <p className="text-xs text-text-tertiary mb-1">Click to register an agent. You'll get a token and CLI command to connect it.</p>
            {QUICK_AGENTS.map((agent) => (
              <button
                key={agent.name}
                onClick={() => handleConnect(agent.name, agent.caps)}
                disabled={status === 'connecting'}
                className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-bg hover:bg-surface-hover hover:border-agent/30 transition-all text-left group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-lg bg-agent/15 flex items-center justify-center text-xl flex-shrink-0 group-hover:bg-agent/25 transition-colors">
                  {agent.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{agent.name}</div>
                  <div className="text-xs text-text-tertiary mt-0.5">{agent.desc}</div>
                  <div className="flex gap-1 mt-1.5">
                    {agent.caps.slice(0, 3).map((c) => (
                      <span key={c} className="px-1.5 py-0.5 rounded text-[10px] bg-agent/10 text-agent/80">{c}</span>
                    ))}
                  </div>
                </div>
                <div className="text-agent opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium pr-1">
                  Connect &rarr;
                </div>
              </button>
            ))}
          </div>
        )}

        {/* WebSocket tab */}
        {tab === 'websocket' && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">1</div>
                <span className="text-sm font-medium text-text-primary">Name your agent</span>
              </div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My Custom Agent"
                className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Capabilities</label>
              <div className="flex flex-wrap gap-2">
                {CAPABILITY_OPTIONS.map((cap) => (
                  <button
                    key={cap}
                    onClick={() => toggleCap(cap)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      selectedCaps.includes(cap)
                        ? 'bg-agent/15 text-agent border border-agent/30'
                        : 'bg-surface-hover text-text-secondary border border-border'
                    }`}
                  >
                    {cap}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">2</div>
                <span className="text-sm font-medium text-text-primary">Register and get your token</span>
              </div>
              <button
                onClick={() => handleConnect(name, selectedCaps)}
                disabled={!name.trim() || status === 'connecting'}
                className="w-full py-2.5 rounded-lg bg-agent text-white font-medium text-sm hover:bg-agent-hover disabled:opacity-40 transition-colors"
              >
                {status === 'connecting' ? 'Registering...' : 'Register Agent'}
              </button>
            </div>

            {/* Python example */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary">Python WebSocket Example</span>
                <button onClick={() => copyText(`import websocket, json\nws = websocket.create_connection("${WS_BASE}/agent")\nws.send(json.dumps({"type": "auth", "name": "My Bot", "capabilities": ["code"]}))\nprint(ws.recv())  # auth_ok with token`, 'python')} className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                  {copiedField === 'python' ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <pre className="text-[11px] text-text-secondary font-mono bg-bg border border-border rounded-lg px-3 py-2 overflow-x-auto whitespace-pre">{`import websocket, json
ws = websocket.create_connection("${WS_BASE}/agent")
ws.send(json.dumps({
    "type": "auth",
    "name": "My Bot",
    "capabilities": ["code"]
}))
print(ws.recv())  # auth_ok with token`}</pre>
            </div>

            {/* curl example */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary">HTTP Registration (curl)</span>
                <button onClick={() => copyText(`curl -X POST ${API_BASE}/api/agents \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "My Bot", "capabilities": ["code"]}'`, 'curl')} className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                  {copiedField === 'curl' ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <pre className="text-[11px] text-text-secondary font-mono bg-bg border border-border rounded-lg px-3 py-2 overflow-x-auto whitespace-pre">{`# Register agent via HTTP
curl -X POST ${API_BASE}/api/agents \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Bot", "capabilities": ["code"]}'`}</pre>
            </div>
          </div>
        )}

        {/* CLI Bridge tab */}
        {tab === 'cli' && (
          <div className="space-y-4">
            <div className="bg-bg border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <IconTerminal className="w-3.5 h-3.5 text-agent" />
                  <span className="text-xs font-medium text-text-secondary">Quickest way to connect</span>
                </div>
                <button onClick={() => copyText(`npx @ollielabs/grid-agent --name "Claude Code" --url ${WS_BASE}/agent${currentWorkspaceId ? ` --workspace ${currentWorkspaceId}` : ''}`, 'quickcli')} className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                  {copiedField === 'quickcli' ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <pre className="text-xs text-agent font-mono bg-surface rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">{`npx @ollielabs/grid-agent --name "Claude Code" --url ${WS_BASE}/agent${currentWorkspaceId ? ` --workspace ${currentWorkspaceId}` : ''}`}</pre>
            </div>

            <div className="bg-bg border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary">With capabilities</span>
                <button onClick={() => copyText(`npx @ollielabs/grid-agent --name "My Bot" --url ${WS_BASE}/agent --capabilities code,writing,research${currentWorkspaceId ? ` --workspace ${currentWorkspaceId}` : ''}`, 'capscli')} className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                  {copiedField === 'capscli' ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <pre className="text-xs text-text-secondary font-mono bg-surface rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">{`npx @ollielabs/grid-agent --name "My Bot" --url ${WS_BASE}/agent --capabilities code,writing,research${currentWorkspaceId ? ` --workspace ${currentWorkspaceId}` : ''}`}</pre>
            </div>

            <div className="bg-bg border border-border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-text-secondary">With a pre-registered token</span>
                <button onClick={() => copyText(`npx @ollielabs/grid-agent --token YOUR_TOKEN --url ${WS_BASE}/agent`, 'tokencli')} className="text-xs text-accent hover:text-accent-hover flex items-center gap-1">
                  {copiedField === 'tokencli' ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
              <pre className="text-xs text-text-secondary font-mono bg-surface rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all">{`npx @ollielabs/grid-agent --token YOUR_TOKEN --url ${WS_BASE}/agent`}</pre>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-text-tertiary mb-3">
                Or register first to get a token, then use it with the CLI:
              </p>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">1</div>
                  <span className="text-sm font-medium text-text-primary">Name your agent</span>
                </div>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Agent name"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="mt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-accent/15 text-accent flex items-center justify-center text-xs font-bold">2</div>
                  <span className="text-sm font-medium text-text-primary">Register to get a token</span>
                </div>
                <button
                  onClick={() => handleConnect(name, [])}
                  disabled={!name.trim() || status === 'connecting'}
                  className="w-full py-2.5 rounded-lg bg-agent text-white font-medium text-sm hover:bg-agent-hover disabled:opacity-40 transition-colors"
                >
                  {status === 'connecting' ? 'Registering...' : 'Register & Get CLI Command'}
                </button>
              </div>
            </div>

            <div className="bg-bg/50 border border-border rounded-lg p-3">
              <p className="text-xs text-text-tertiary">
                <span className="font-medium text-text-secondary">Install globally:</span>{' '}
                <code className="text-agent">npm install -g @ollielabs/grid-agent</code>
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                <span className="font-medium text-text-secondary">SDK docs:</span>{' '}
                <code className="text-agent">npm info @ollielabs/grid-agent</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
