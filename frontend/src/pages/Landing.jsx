import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import {
  ArrowRight, Search, Zap, BookOpen, Shield,
  CheckCircle2, Upload, Brain, Users,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Search,
    color: 'text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/20',
    title: 'Semantic Search',
    desc: 'FAISS vector search finds the most relevant runbook passages — not just keyword matches.',
  },
  {
    icon: Brain,
    color: 'text-primary-400',
    bg: 'bg-primary-600/10 border-primary-600/20',
    title: 'AI-Generated Resolutions',
    desc: 'Gemini synthesises your runbooks into clear, step-by-step resolution guides with source citations.',
  },
  {
    icon: Zap,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    title: 'Live Streaming Answers',
    desc: 'Watch the resolution appear word-by-word as the AI generates it — no waiting for the full response.',
  },
  {
    icon: Shield,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    title: 'Confidence Scoring',
    desc: 'Every answer is scored for confidence so you know when to trust the AI and when to escalate.',
  },
  {
    icon: BookOpen,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    title: 'Runbook Management',
    desc: 'Upload PDF, DOCX, or TXT runbooks. Admin and personal scopes keep knowledge organised.',
  },
  {
    icon: Users,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    title: 'Team Playbook',
    desc: 'Bookmark resolutions, share links, and track query history across your entire IT team.',
  },
];

const STEPS = [
  {
    n: '01',
    title: 'Upload Runbooks',
    desc: 'Drag & drop your PDF, DOCX, or TXT runbooks. They\'re chunked, embedded, and indexed in seconds.',
  },
  {
    n: '02',
    title: 'Ask in Plain English',
    desc: 'Describe the IT issue as you\'d explain it to a colleague. No need to know which runbook to search.',
  },
  {
    n: '03',
    title: 'Get Step-by-Step Resolution',
    desc: 'Receive a cited, AI-synthesised resolution with source attribution and a confidence score.',
  },
];

export default function Landing() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh text-dark-200">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-dark-950/90 backdrop-blur-xl border-b border-dark-800/60">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center shadow-md shadow-primary-600/25">
              <LogoIcon />
            </div>
            <span className="text-[15px] font-bold text-dark-100">
              ResolveIT <span className="text-primary-400">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost text-sm">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm flex items-center gap-1.5">
              Get started <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center animate-fade-in">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-600/10 border border-primary-600/25 text-primary-400 text-xs font-semibold mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
          RAG-powered IT Resolution Assistant
        </div>

        <h1 className="text-5xl sm:text-6xl font-extrabold text-dark-50 leading-[1.1] tracking-tight mb-6">
          Resolve IT issues{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
            instantly
          </span>
          <br />from your runbooks
        </h1>

        <p className="text-lg text-dark-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          ResolveIT AI searches your internal runbooks semantically and generates cited, step-by-step resolutions using Gemini — so your team spends less time digging and more time fixing.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            to="/register"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-500 transition-all duration-200 shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30"
          >
            Start for free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            to="/login"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-900 text-dark-300 font-semibold text-sm border border-dark-800/80 hover:border-dark-700 hover:text-dark-200 transition-all duration-200"
          >
            Sign in to your account
          </Link>
        </div>

        {/* Social proof chips */}
        <div className="flex items-center justify-center gap-4 mt-10 flex-wrap">
          {['FAISS Vector Search', 'Gemini 1.5 Flash', 'Cross-Encoder Reranking', 'Firebase Auth'].map(t => (
            <span key={t} className="flex items-center gap-1.5 text-xs text-dark-600">
              <CheckCircle2 className="w-3 h-3 text-emerald-500/60" />
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* ── Mock UI preview ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="glass-card p-px overflow-hidden shadow-2xl shadow-black/50">
          {/* Window chrome */}
          <div className="bg-dark-900 border-b border-dark-800/60 px-4 py-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/60" />
            <span className="w-3 h-3 rounded-full bg-amber-500/60" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/60" />
            <div className="flex-1 mx-4">
              <div className="bg-dark-800/60 border border-dark-700/50 rounded-lg px-3 py-1 max-w-xs mx-auto text-center text-xs text-dark-600">
                resolveit.app/dashboard
              </div>
            </div>
          </div>

          {/* Mock dashboard content */}
          <div className="bg-dark-950 p-6 space-y-5">
            {/* Greeting */}
            <div>
              <p className="text-lg font-bold text-dark-100">Good morning, Alex.</p>
              <p className="text-xs text-dark-600 mt-0.5">42 runbook chunks · 8 recent queries · 81% avg confidence</p>
            </div>

            {/* Category pills */}
            <div className="flex gap-2 flex-wrap">
              {['Server', 'Network', 'Application', 'Other'].map((c, i) => (
                <span key={c} className={`px-3.5 py-1.5 rounded-full text-xs font-medium border ${
                  i === 0 ? 'border-red-500/30 text-red-300 bg-red-500/5' : 'border-dark-800/60 text-dark-600'
                }`}>{c}</span>
              ))}
            </div>

            {/* Search bar */}
            <div className="flex items-center bg-dark-900 border border-dark-800/70 rounded-2xl px-4 py-3 gap-3">
              <Search className="w-4 h-4 text-dark-600" />
              <span className="text-sm text-dark-600 flex-1">Apache returning 502 Bad Gateway errors…</span>
              <span className="px-4 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-semibold flex items-center gap-1">
                Resolve <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            {/* Mock result */}
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <div className="w-16 h-1.5 bg-dark-800/80 rounded-full overflow-hidden">
                  <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                </div>
                <span className="text-xs font-mono text-emerald-400 font-semibold">84%</span>
                <span className="text-xs text-dark-700">High confidence</span>
              </div>
              <div className="space-y-2">
                {['Check upstream server status and error logs', 'Verify ProxyPass directive in Apache config', 'Restart the upstream application service', 'Test with curl and review response headers'].map((s, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-dark-800/60 bg-dark-950/40">
                    <div className={`w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${i < 2 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' : 'border-dark-700 text-dark-700'}`}>
                      {i < 2 ? '✓' : i + 1}
                    </div>
                    <span className={`text-sm ${i < 2 ? 'line-through text-dark-600' : 'text-dark-300'}`}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-dark-100 mb-3">Everything your IT team needs</h2>
          <p className="text-dark-500 text-base max-w-xl mx-auto">From runbook upload to AI-generated resolution in seconds.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
            <div key={title} className="glass-card p-5 hover:border-dark-700/80 transition-all duration-200 space-y-3">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${bg}`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} style={{ width: 18, height: 18 }} />
              </div>
              <h3 className="text-sm font-semibold text-dark-100">{title}</h3>
              <p className="text-sm text-dark-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-dark-100 mb-3">How it works</h2>
          <p className="text-dark-500 text-base">Three steps from problem to resolution.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map(({ n, title, desc }, i) => (
            <div key={n} className="relative">
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute top-7 left-full w-full h-px bg-gradient-to-r from-dark-800 to-transparent -translate-y-1/2 z-0" />
              )}
              <div className="relative z-10 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-dark-900 border border-dark-800/70 flex items-center justify-center">
                  <span className="text-lg font-black text-primary-600 font-mono">{n}</span>
                </div>
                <h3 className="text-base font-semibold text-dark-100">{title}</h3>
                <p className="text-sm text-dark-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="glass-card p-10 text-center space-y-5 border-primary-600/15">
          <div className="w-12 h-12 mx-auto rounded-xl bg-primary-600 flex items-center justify-center shadow-lg shadow-primary-600/25">
            <LogoIcon />
          </div>
          <h2 className="text-2xl font-bold text-dark-100">Ready to resolve faster?</h2>
          <p className="text-dark-500 text-sm max-w-md mx-auto">
            Set up takes under 2 minutes. Upload a runbook, ask a question, get your first AI resolution.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link
              to="/register"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm hover:bg-primary-500 transition-all duration-200 shadow-lg shadow-primary-600/20"
            >
              Create free account <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="text-sm text-dark-500 hover:text-dark-300 transition-colors font-medium"
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-dark-800/50 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-primary-600 flex items-center justify-center">
              <LogoIcon small />
            </div>
            <span className="text-sm font-bold text-dark-400">
              ResolveIT <span className="text-primary-500">AI</span>
            </span>
          </div>
          <p className="text-xs text-dark-700">
            Powered by Gemini · FAISS · Firebase · FastAPI
          </p>
        </div>
      </footer>
    </div>
  );
}

function LogoIcon({ small }) {
  const s = small ? 12 : 18;
  return (
    <svg viewBox="0 0 20 20" fill="none" width={s} height={s}>
      <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 2v16M3 7l7 5 7-5" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}
