import { useState, useEffect } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { supabase } from '../../lib/supabase';
import { IconX, IconCopy, IconCheck, IconTerminal } from '../../lib/icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const API_BASE = 'https://grid-backend-production.up.railway.app';

export default function InviteModal() {
  const { setShowInviteModal } = useEditorStore();
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentWorkspaceId);
  const userId = useWorkspaceStore((s) => s.userId);
  const [copied, setCopied] = useState(false);
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [loadingLink, setLoadingLink] = useState(true);
  const [agentJoinCode, setAgentJoinCode] = useState<string | null>(null);
  const [loadingAgentCode, setLoadingAgentCode] = useState(false);

  // Load or create invite code on mount
  useEffect(() => {
    async function loadOrCreateInvite() {
      setLoadingLink(true);
      try {
        // Check for existing invite
        const { data: existing } = await supabase
          .from('workspace_invites')
          .select('code, expires_at')
          .eq('workspace_id', currentWorkspaceId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing && new Date(existing.expires_at) > new Date()) {
          setInviteLink(`${window.location.origin}?join=${existing.code}`);
          setLoadingLink(false);
          return;
        }

        // Create new invite code
        const code = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
        const { error: insertErr } = await supabase.from('workspace_invites').insert({
          workspace_id: currentWorkspaceId,
          code,
          created_by: userId ?? '',
        });

        if (insertErr) {
          // If table doesn't exist, show a fallback link
          setInviteLink(window.location.origin);
          setError('Invite system not set up yet. Run the migration SQL.');
        } else {
          setInviteLink(`${window.location.origin}?join=${code}`);
        }
      } catch {
        setInviteLink(window.location.origin);
      }
      setLoadingLink(false);
    }

    loadOrCreateInvite();
  }, [currentWorkspaceId, userId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendInvite = async () => {
    if (!email || sending) return;
    setError('');
    setSending(true);
    try {
      const res = await fetch(`${API_URL}/api/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send');
      setSent(true);
      setEmail('');
      setTimeout(() => setSent(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
      <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Invite People</h2>
          <button
            onClick={() => setShowInviteModal(false)}
            className="p-1 rounded-md text-text-tertiary hover:text-text-secondary hover:bg-surface-hover transition-colors"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5">
          {/* Invite link */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Share link
            </label>
            <div className="flex gap-2">
              <input
                readOnly
                value={loadingLink ? 'Generating link...' : inviteLink}
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary font-mono outline-none select-all"
              />
              <button
                onClick={handleCopy}
                disabled={loadingLink}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 min-w-[90px] justify-center ${
                  copied
                    ? 'bg-online/15 text-online border border-online/30'
                    : 'bg-accent text-white hover:bg-accent-hover disabled:opacity-50'
                }`}
              >
                {copied ? (
                  <><IconCheck className="w-4 h-4" /><span>Copied!</span></>
                ) : (
                  <><IconCopy className="w-4 h-4" /><span>Copy</span></>
                )}
              </button>
            </div>
          </div>

          <div className="bg-bg/80 border border-border/50 rounded-lg p-3.5">
            <p className="text-xs text-text-secondary leading-relaxed">
              Share this link to invite friends. They sign up, bring their own agents, and collaborate in real-time. Link expires in 30 days.
            </p>
          </div>

          {/* Agent connect */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Or connect an agent directly
            </label>
            {agentJoinCode ? (
              <div className="bg-agent/5 border border-agent/20 rounded-lg p-3">
                <pre className="text-xs text-agent font-mono font-semibold bg-surface rounded px-3 py-2 overflow-x-auto whitespace-pre-wrap break-all mb-2">{`grid-agent bridge claude --join ${agentJoinCode}`}</pre>
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-text-tertiary">Replace <code className="text-agent">claude</code> with your agent. Code expires in 7 days.</p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`grid-agent bridge claude --join ${agentJoinCode}`);
                      setCopiedAgent(true);
                      setTimeout(() => setCopiedAgent(false), 2000);
                    }}
                    className="px-3 py-1 rounded-md bg-agent text-white text-xs font-medium hover:bg-agent-hover transition-colors flex items-center gap-1 flex-shrink-0 ml-2"
                  >
                    {copiedAgent ? <><IconCheck className="w-3 h-3" /> Copied</> : <><IconCopy className="w-3 h-3" /> Copy</>}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={async () => {
                  setLoadingAgentCode(true);
                  try {
                    const res = await fetch(`${API_BASE}/api/agent-codes`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        agentName: 'Agent',
                        capabilities: ['code', 'writing'],
                        workspaceId: currentWorkspaceId,
                      }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setAgentJoinCode(data.code);
                    }
                  } catch {}
                  setLoadingAgentCode(false);
                }}
                disabled={loadingAgentCode}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-agent/20 bg-agent/5 text-agent text-sm font-medium hover:bg-agent/10 transition-colors disabled:opacity-50"
              >
                <IconTerminal className="w-4 h-4" />
                {loadingAgentCode ? 'Generating...' : 'Generate Agent Join Code'}
              </button>
            )}
          </div>

          {/* Email invite */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Invite by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                placeholder="email@example.com"
                className="flex-1 bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-accent transition-colors"
              />
              <button
                onClick={handleSendInvite}
                disabled={sending || !email}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  sent
                    ? 'bg-online/15 text-online border border-online/30'
                    : 'bg-accent text-white hover:bg-accent-hover'
                }`}
              >
                {sending ? 'Sending...' : sent ? 'Sent!' : 'Send'}
              </button>
            </div>
            {error && <p className="text-xs text-danger mt-1.5">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
