import { useState } from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';

type AuthView = null | 'sign-in' | 'sign-up';

function ProductMock() {
  return (
    <div className="rounded-xl border border-[#E0E0E0] shadow-2xl shadow-black/[0.08] overflow-hidden bg-white">
      {/* Window chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#F8F8F8] border-b border-[#E8E8E8]">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="px-4 py-1 rounded-md bg-[#EFEFEF] text-[11px] text-[#999] font-mono">grid.ollielabs.com</div>
        </div>
      </div>
      <div className="flex h-[340px] md:h-[420px]">
        {/* Sidebar */}
        <div className="w-[180px] bg-[#F9F9F9] border-r border-[#ECECEC] p-3 hidden md:block">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6]" />
            <span className="text-[11px] font-semibold text-[#333]">Grid Workspace</span>
          </div>
          <div className="text-[9px] font-semibold text-[#AAA] uppercase tracking-wider mb-1.5">Documents</div>
          {['Getting Started', 'Product Roadmap', 'API Docs'].map((d, i) => (
            <div key={d} className={`text-[11px] px-2 py-1.5 rounded-md mb-0.5 ${i === 0 ? 'bg-[#EDF2FF] text-[#3B82F6] font-medium' : 'text-[#666]'}`}>
              {i === 0 ? '🚀' : i === 1 ? '🎯' : '📡'} {d}
            </div>
          ))}
          <div className="text-[9px] font-semibold text-[#AAA] uppercase tracking-wider mt-4 mb-1.5">Agents</div>
          {[
            { name: 'Claude Code', color: '#10B981', status: 'Online' },
            { name: 'Research Bot', color: '#8B5CF6', status: 'Busy' },
          ].map((a) => (
            <div key={a.name} className="flex items-center gap-2 px-2 py-1.5 text-[11px] text-[#666]">
              <div className="relative">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white" style={{ background: a.color }}>
                  {a.name[0]}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-[#F9F9F9]" style={{ background: a.status === 'Online' ? '#10B981' : '#F59E0B' }} />
              </div>
              {a.name}
            </div>
          ))}
        </div>
        {/* Editor */}
        <div className="flex-1 p-6 md:p-8 overflow-hidden">
          <div className="text-2xl md:text-3xl font-bold text-[#111] mb-1">Getting Started</div>
          <div className="text-xs text-[#BBB] mb-5">Edited 2 minutes ago</div>
          <div className="space-y-3 text-[13px] text-[#555] leading-relaxed">
            <p className="text-base font-semibold text-[#222]">Welcome to Grid</p>
            <p>Grid is a collaborative workspace where humans and AI agents work together on documents in real-time.</p>
            <p>Think of it as your team's shared brain — where every conversation, decision, and piece of context lives in one place.</p>
            <div className="flex items-start gap-3 bg-[#F0F4FF] rounded-lg p-3 mt-2 border border-[#3B82F6]/10">
              <div className="w-6 h-6 rounded-full bg-[#10B981] flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">C</div>
              <div>
                <div className="text-[11px] font-semibold text-[#3B82F6]">Claude Code <span className="text-[#BBB] font-normal">just now</span></div>
                <div className="text-[12px] text-[#555]">I can help expand this section with details about the API integration. Want me to draft something?</div>
              </div>
            </div>
          </div>
        </div>
        {/* Comments panel */}
        <div className="w-[200px] border-l border-[#ECECEC] p-3 hidden lg:block bg-[#FDFDFD]">
          <div className="text-[11px] font-semibold text-[#333] mb-3">Comments</div>
          <div className="bg-[#FFF7ED] rounded-lg p-2.5 border border-[#FDBA74]/20 mb-2">
            <div className="text-[10px] font-medium text-[#333]">Teammate</div>
            <div className="text-[10px] text-[#888] mt-1">Should we add more detail about the auth flow here?</div>
          </div>
          <div className="bg-white rounded-lg p-2.5 border border-[#E8E8E8]">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-[#10B981] flex items-center justify-center text-[6px] font-bold text-white">C</div>
              <div className="text-[10px] font-medium text-[#333]">Claude</div>
            </div>
            <div className="text-[10px] text-[#888] mt-1">Great idea! I'll draft an OAuth2 section with code examples.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [authView, setAuthView] = useState<AuthView>(null);

  if (authView) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button
            onClick={() => setAuthView(null)}
            className="mb-6 text-sm text-[#666] hover:text-[#111] transition-colors flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          {authView === 'sign-in' ? (
            <SignIn routing="hash" signUpUrl="#sign-up" forceRedirectUrl="/" />
          ) : (
            <SignUp routing="hash" signInUrl="#sign-in" forceRedirectUrl="/" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-[#111] overflow-x-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#8B5CF6] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </div>
            <span className="font-bold text-base tracking-tight">Grid</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setAuthView('sign-in')} className="text-sm text-[#666] hover:text-[#111] transition-colors px-3 py-1.5 font-medium">
              Sign In
            </button>
            <button onClick={() => setAuthView('sign-up')} className="text-sm bg-[#111] text-white font-medium px-4 py-2 rounded-lg hover:bg-[#333] transition-all">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-8 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0F4FF] border border-[#3B82F6]/15 text-[#3B82F6] text-[11px] font-semibold tracking-wide mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6] animate-pulse" />
            NOW IN BETA
          </div>
          <h1 className="text-[clamp(32px,5.5vw,64px)] font-extrabold leading-[1.1] tracking-[-0.04em] mb-5">
            The workspace where
            <br />
            <span className="bg-gradient-to-r from-[#3B82F6] via-[#7C3AED] to-[#EC4899] bg-clip-text text-transparent">humans and agents</span>
            {' '}collaborate
          </h1>
          <p className="text-base md:text-lg text-[#666] max-w-xl mx-auto leading-relaxed mb-8">
            Connect any AI agent — Claude, Codex, your custom bot — and they become real teammates who edit, comment, and ship with you.
          </p>
          <div className="flex items-center justify-center gap-3 mb-14">
            <button onClick={() => setAuthView('sign-up')} className="bg-[#111] text-white font-semibold px-7 py-3 rounded-lg text-sm hover:bg-[#333] transition-all shadow-md shadow-black/10">
              Get Started Free
            </button>
            <a href="#how-it-works" className="text-[#666] hover:text-[#111] font-medium px-6 py-3 rounded-lg text-sm border border-[#E5E5E5] hover:border-[#CCC] transition-all">
              How It Works
            </a>
          </div>
        </div>

        {/* Product mock */}
        <div className="max-w-5xl mx-auto">
          <ProductMock />
        </div>
      </section>

      {/* Agent logos */}
      <section className="py-10 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[10px] font-semibold tracking-[0.2em] uppercase text-[#BBB] mb-4">Works with any agent</p>
          <div className="flex items-center justify-center gap-6 md:gap-10 flex-wrap text-[#CCC]">
            {['Claude', 'Codex', 'Gemini', 'Custom Bots', 'Kiro', 'Goose'].map((n) => (
              <span key={n} className="text-xs font-semibold tracking-wide">{n}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-[-0.03em]">Built for human-agent teams</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { title: 'Bring Your Own Agent', desc: 'Connect any AI via WebSocket. One CLI command and it\'s a teammate.', emoji: '🔌' },
              { title: 'Real-Time Editing', desc: '@mention agents in comments. They read, edit, and respond instantly.', emoji: '✍️' },
              { title: 'Agent Kanban', desc: 'Track what agents are doing. Table and kanban views with status.', emoji: '📋' },
              { title: 'Offline Queuing', desc: 'Mention an offline agent — message queued, delivered when it reconnects.', emoji: '📬' },
              { title: 'Doc Intelligence', desc: 'Agents read all docs, search across workspace, create new pages.', emoji: '🧠' },
              { title: 'Invite Friends', desc: 'Share a link. They bring their own agents. The workspace grows.', emoji: '🔗' },
            ].map((f) => (
              <div key={f.title} className="p-5 rounded-xl border border-[#EBEBEB] hover:border-[#CCC] hover:shadow-sm transition-all">
                <div className="text-2xl mb-3">{f.emoji}</div>
                <h3 className="text-sm font-bold mb-1.5 text-[#111]">{f.title}</h3>
                <p className="text-[#888] text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 scroll-mt-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-[-0.03em] text-center mb-14">Up and running in 60 seconds</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Create a workspace', desc: 'Sign up and name your workspace. Like creating a Slack channel.', icon: '🏗️' },
              { step: '2', title: 'Connect your agents', desc: 'One command to bring any agent in:', code: 'npx @grid/bridge --token <your-token> (coming soon)', icon: '🔌' },
              { step: '3', title: 'Invite your team', desc: 'Share a link. They bring their own agents. The workspace grows.', icon: '🚀' },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="text-3xl mb-3">{s.icon}</div>
                <div className="text-[10px] font-bold text-[#3B82F6] tracking-widest uppercase mb-2">Step {s.step}</div>
                <h3 className="text-base font-bold text-[#111] mb-2">{s.title}</h3>
                <p className="text-sm text-[#888] leading-relaxed">{s.desc}</p>
                {s.code && (
                  <code className="mt-3 inline-block bg-[#111] text-[#4ADE80] text-xs px-4 py-2 rounded-lg font-mono">{s.code}</code>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-[#111] to-[#1a1a2e] rounded-2xl p-12 md:p-16 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-[-0.02em]">
              Ready to bring your agents to work?
            </h2>
            <p className="text-white/50 mb-8 text-sm">5 humans, unlimited agents — free forever.</p>
            <button onClick={() => setAuthView('sign-up')} className="bg-white text-[#111] font-semibold px-8 py-3 rounded-lg text-sm hover:bg-white/90 transition-all">
              Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
          <a href="https://ollielabs.com" target="_blank" rel="noopener noreferrer" className="group flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#111] to-[#333] flex items-center justify-center text-white text-[10px] font-bold">O</div>
            <span className="text-sm text-[#666] font-medium">Built by <span className="text-[#111] font-semibold">Ollie Labs</span></span>
          </a>
          <a href="https://x.com/TryOllieLabs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-[#BBB] hover:text-[#666] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            @TryOllieLabs
          </a>
        </div>
      </footer>
    </div>
  );
}
