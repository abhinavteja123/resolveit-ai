import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  ArrowRight, Search, Zap, BookOpen, Shield,
  CheckCircle2, Brain, Users, Loader2
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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function Landing() {
  const { user, loading } = useAuth();
  
  // Mock UI State
  const [mockState, setMockState] = useState('idle'); // idle, typing, searching, generating, done
  const [mockQuery, setMockQuery] = useState('');
  const [mockStream, setMockStream] = useState([]);
  
  const fullQuery = "Database connection pooling failing under load...";
  const fullResponse = [
    "Check PostgreSQL max_connections in postgresql.conf",
    "Verify pgBouncer configuration and pool size settings",
    "Review application connection leak logs",
    "Scale up connection pool instances dynamically"
  ];

  useEffect(() => {
    let timeout;
    let isActive = true;

    const runSequence = async () => {
      if (!isActive) return;
      await new Promise(r => setTimeout(r, 1500));
      
      if (!isActive) return;
      setMockState('typing');
      for (let i = 0; i <= fullQuery.length; i++) {
        if (!isActive) return;
        setMockQuery(fullQuery.slice(0, i));
        await new Promise(r => setTimeout(r, 35)); // Typing speed
      }
      
      if (!isActive) return;
      setMockState('searching');
      await new Promise(r => setTimeout(r, 800));
      
      if (!isActive) return;
      setMockState('generating');
      for (let i = 0; i < fullResponse.length; i++) {
        if (!isActive) return;
        await new Promise(r => setTimeout(r, 500));
        setMockStream(prev => [...prev, fullResponse[i]]);
      }
      
      if (!isActive) return;
      setMockState('done');
      
      timeout = setTimeout(() => {
        if (!isActive) return;
        setMockQuery('');
        setMockStream([]);
        setMockState('idle');
        runSequence();
      }, 4000);
    };
    
    runSequence();
    return () => { isActive = false; clearTimeout(timeout); };
  }, []);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh text-dark-200 relative overflow-hidden">
      
      {/* Ambient background orbs */}
      <div className="ambient-orb w-[600px] h-[600px] bg-primary-600/20 top-[-200px] left-[-200px]" />
      <div className="ambient-orb w-[800px] h-[800px] bg-violet-600/15 top-[20%] right-[-300px]" />

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/60">
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
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-20 text-center relative z-10">
        <motion.div initial="hidden" animate="visible" variants={staggerContainer} className="flex flex-col items-center">
          {/* Badge */}
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-600/10 border border-primary-600/25 text-primary-400 text-xs font-semibold mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
            RAG-powered IT Resolution Assistant
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl sm:text-7xl font-extrabold text-dark-50 leading-[1.1] tracking-tight mb-6">
            Resolve IT issues{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-600">
              instantly
            </span>
            <br />from your runbooks
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg text-dark-400 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            ResolveIT AI searches your internal runbooks semantically and generates cited, step-by-step resolutions using Gemini — so your team spends less time digging and more time fixing.
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center justify-center gap-3 flex-wrap">
            <Link to="/register">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm shadow-lg shadow-primary-600/20 hover:shadow-primary-600/40 transition-shadow">
                Start for free <ArrowRight className="w-4 h-4" />
              </motion.button>
            </Link>
            <Link to="/login">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-dark-900 text-dark-300 font-semibold text-sm border border-dark-800/80 hover:border-dark-700 hover:bg-dark-800 transition-colors">
                Sign in to your account
              </motion.button>
            </Link>
          </motion.div>

          {/* Social proof chips */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-4 mt-12 flex-wrap">
            {['FAISS Vector Search', 'Gemini 1.5 Pro', 'Cross-Encoder Reranking', 'Secure Auth'].map(t => (
              <span key={t} className="flex items-center gap-1.5 text-xs text-dark-500 font-medium tracking-wide">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500/80" />
                {t}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ── Interactive Mock UI Preview ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="glass-card overflow-hidden"
        >
          {/* Window chrome */}
          <div className="bg-dark-950/80 border-b border-dark-800/60 px-4 py-3 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <div className="flex-1 mx-4">
              <div className="bg-dark-900/60 border border-dark-800/50 rounded-lg px-3 py-1 max-w-xs mx-auto text-center text-[11px] text-dark-500 font-medium tracking-wider">
                resolveit.app/dashboard
              </div>
            </div>
          </div>

          {/* Mock dashboard content */}
          <div className="bg-dark-950/50 p-6 md:p-8 space-y-6">
            
            {/* Search bar */}
            <div className={`flex items-center bg-dark-900 border ${mockState === 'typing' || mockState === 'searching' ? 'border-primary-500/50 ring-1 ring-primary-500/20' : 'border-dark-800/70'} rounded-2xl px-4 py-3.5 gap-3 transition-all duration-300`}>
              <Search className={`w-5 h-5 ${mockState !== 'idle' ? 'text-primary-500' : 'text-dark-600'}`} />
              <span className={`text-sm flex-1 ${mockQuery ? 'text-dark-100' : 'text-dark-600'}`}>
                {mockQuery || "Describe the IT issue..."}
                {mockState === 'typing' && <span className="inline-block w-0.5 h-4 bg-primary-500 ml-1 animate-pulse align-middle" />}
              </span>
              <button className="px-4 py-1.5 rounded-xl bg-primary-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md">
                {mockState === 'searching' ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Resolve'}
              </button>
            </div>

            {/* Mock result */}
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: (mockState === 'generating' || mockState === 'done') ? 1 : 0, height: 'auto' }}
              className="glass-card p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-semibold tracking-wider">88% CONFIDENCE</span>
                </div>
                <span className="text-[11px] text-dark-500 font-medium bg-dark-800/50 px-2 py-1 rounded-md">
                  Source: postgres_runbook.pdf
                </span>
              </div>
              
              <div className="space-y-2.5 pt-1">
                {mockStream.map((s, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={i} 
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-dark-800/60 bg-dark-900/40"
                  >
                    <div className="w-5 h-5 rounded-full border border-dark-700 bg-dark-800 flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 text-dark-400">
                      {i + 1}
                    </div>
                    <span className="text-sm text-dark-200 leading-relaxed">{s}</span>
                  </motion.div>
                ))}
                
                {mockState === 'generating' && (
                  <div className="flex items-center gap-2 p-3 text-sm text-primary-500/80">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="stream-cursor">Synthesising resolution</span>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-6xl mx-auto px-6 pb-24 relative z-10">
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold text-dark-50 mb-4 tracking-tight">Everything your IT team needs</motion.h2>
          <motion.p variants={fadeUp} className="text-dark-400 text-base max-w-xl mx-auto font-medium">From runbook upload to AI-generated resolution in seconds.</motion.p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, color, bg, title, desc }, index) => (
            <motion.div 
              key={title} 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ y: -5 }}
              className="glass-card p-6 border-dark-800/50 hover:border-dark-700/80 transition-colors space-y-4 group"
            >
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${bg} group-hover:scale-110 transition-transform duration-300`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="text-base font-bold text-dark-100">{title}</h3>
              <p className="text-sm text-dark-400 leading-relaxed font-medium">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="max-w-5xl mx-auto px-6 pb-32 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-dark-50 mb-4 tracking-tight">How it works</h2>
          <p className="text-dark-400 text-base font-medium">Three steps from problem to resolution.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6 relative">
          <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-dark-800 via-dark-700 to-dark-800 z-0" />
          
          {STEPS.map(({ n, title, desc }, i) => (
            <motion.div 
              key={n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative z-10 space-y-5 text-center md:text-left"
            >
              <div className="w-16 h-16 mx-auto md:mx-0 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-center shadow-inner shadow-white/5">
                <span className="text-xl font-black text-primary-500 font-mono tracking-tighter">{n}</span>
              </div>
              <h3 className="text-lg font-bold text-dark-100">{title}</h3>
              <p className="text-sm text-dark-400 leading-relaxed font-medium">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="glass-card p-12 text-center space-y-6 border-primary-600/20 relative overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-primary-600/20 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="w-14 h-14 mx-auto rounded-2xl bg-primary-600 flex items-center justify-center shadow-xl shadow-primary-600/30 relative z-10">
            <LogoIcon />
          </div>
          <h2 className="text-3xl font-extrabold text-dark-50 tracking-tight relative z-10">Ready to resolve faster?</h2>
          <p className="text-dark-300 text-base max-w-md mx-auto font-medium relative z-10">
            Set up takes under 2 minutes. Upload a runbook, ask a question, get your first AI resolution.
          </p>
          <div className="flex items-center justify-center gap-4 pt-4 relative z-10 flex-wrap">
            <Link to="/register">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-6 py-3 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-500 transition-colors shadow-lg shadow-primary-600/20">
                Create free account <ArrowRight className="w-4 h-4 inline-block ml-1" />
              </motion.button>
            </Link>
            <Link to="/login" className="text-sm text-dark-400 hover:text-dark-200 transition-colors font-semibold">
              Already have an account?
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-dark-800/50 py-10 relative z-10 bg-dark-950/50">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <LogoIcon small />
            </div>
            <span className="text-sm font-bold text-dark-300 tracking-wide">
              ResolveIT <span className="text-primary-500">AI</span>
            </span>
          </div>
          <p className="text-xs text-dark-600 font-medium">
            Powered by Gemini · FAISS · Firebase · FastAPI
          </p>
        </div>
      </footer>
    </div>
  );
}

function LogoIcon({ small }) {
  const s = small ? 14 : 20;
  return (
    <svg viewBox="0 0 20 20" fill="none" width={s} height={s}>
      <path d="M10 2L3 7v6l7 5 7-5V7L10 2z" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
      <path d="M10 2v16M3 7l7 5 7-5" stroke="white" strokeWidth="1.8" strokeLinejoin="round"/>
    </svg>
  );
}
