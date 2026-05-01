import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import QueryInput from '../components/QueryInput';
import ResultCard from '../components/ResultCard';
import CommandCenter from '../components/CommandCenter';
import { useQuery } from '../hooks/useQuery';
import { AlertTriangle, Zap, Brain, Sparkles, Lightbulb, ShieldAlert, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

const SCOPE_OPTIONS = [
  { value: 'admin', label: 'Admin Runbooks' },
  { value: 'mine',  label: 'My Runbooks' },
  { value: 'both',  label: 'Admin + Mine' },
];

const MODE_OPTIONS = [
  { value: 'fast',     label: 'Fast',     icon: Zap,            hint: 'Skip HyDE · ~1s' },
  { value: 'standard', label: 'Standard', icon: Sparkles,       hint: 'Default pipeline' },
  { value: 'deep',     label: 'Deep',     icon: Brain,          hint: 'Wider recall + verify' },
  { value: 'eli5',     label: 'ELI5',     icon: GraduationCap,  hint: 'Beginner-friendly' },
  { value: 'expert',   label: 'Expert',   icon: Lightbulb,      hint: 'Concise SRE-grade' },
  { value: 'dryrun',   label: 'Dry-run',  icon: ShieldAlert,    hint: 'Annotated + rollback' },
];

function UserMessage({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] bg-primary-600/15 border border-primary-600/20 text-dark-200 rounded-2xl rounded-br-sm px-4 py-3 text-[15px] leading-relaxed">
        {text}
      </div>
    </div>
  );
}

function AssistantMessage({ result, queryText, onFeedback, onRegenerate, onFollowUp }) {
  return (
    <div className="w-full">
      <ResultCard
        result={result}
        onFeedback={onFeedback}
        queryText={queryText}
        onRegenerate={onRegenerate}
        onFollowUp={onFollowUp}
      />
    </div>
  );
}

function StreamingBubble({ loading, streamingText, streaming }) {
  return (
    <div className="w-full animate-fade-in">
      <div className="glass-card overflow-hidden">
        <div className="px-5 py-3.5 border-b border-dark-800/50 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
          <span className="text-xs text-dark-500 font-medium">
            {loading && !streamingText ? 'Searching runbooks…' : 'Generating resolution…'}
          </span>
        </div>
        <div className="px-5 py-4">
          {loading && !streamingText ? (
            <div className="space-y-2.5">
              {[100, 83, 67, 90, 75].map((w, i) => (
                <div key={i} className="skeleton h-3 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : (
            <p className={`text-sm text-dark-300 leading-relaxed whitespace-pre-wrap font-mono ${streaming ? 'stream-cursor' : ''}`}>
              {streamingText}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function ErrorBubble({ error }) {
  return (
    <div className="w-full animate-slide-up">
      <div className="glass-card p-4 border-red-500/20">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-400">Query failed</p>
            <p className="text-xs text-dark-600 mt-0.5">{error}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { result, loading, streaming, streamingText, error, submitQueryStream, submitFeedback } = useQuery();
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [scope, setScope] = useState('admin');
  const [mode, setMode] = useState('standard');
  const [threadId, setThreadId] = useState(null);
  const chatEndRef = useRef(null);
  const queryInputRef = useRef(null);
  const isWorking = loading || streaming;

  // Seed chat from history "Continue Chat" navigation
  useEffect(() => {
    if (location.state?.seed?.length) {
      setMessages(location.state.seed);
      if (location.state.threadId) setThreadId(location.state.threadId);
      window.history.replaceState({}, '', location.pathname);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for "New Chat" events dispatched by the Sidebar
  useEffect(() => {
    const handleNewChat = () => {
      setMessages([]);
      setThreadId(null);
      window.history.replaceState({}, '', location.pathname);
    };
    window.addEventListener('new-chat', handleNewChat);
    return () => window.removeEventListener('new-chat', handleNewChat);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages or streaming text changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, streamingText]);

  // When streaming finishes and result is ready, add assistant message to chat
  useEffect(() => {
    if (result && !streaming && !loading) {
      // First query establishes the thread — subsequent queries continue it
      if (!threadId && result.query_log_id) setThreadId(result.query_log_id);
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.type === 'user') {
          return [...prev, { id: Date.now(), type: 'assistant', result, queryText: last.text }];
        }
        return prev;
      });
    }
  }, [result, streaming, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // When an error occurs, add error message to chat
  useEffect(() => {
    if (error && !isWorking) {
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.type === 'user') {
          return [...prev, { id: Date.now(), type: 'error', text: error }];
        }
        return prev;
      });
    }
  }, [error, isWorking]);

  const runQuery = async (queryText, runOpts = {}) => {
    try {
      await submitQueryStream(queryText, { scope, mode, threadId, ...runOpts });
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleQuery = async (queryText) => {
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: queryText }]);
    await runQuery(queryText);
  };

  const handleQuickAction = (prefilled) => {
    queryInputRef.current?.setQueryText(prefilled);
    queryInputRef.current?.focus?.();
  };

  const handleRegenerate = async (queryText, regenerateMode, regenerateOf) => {
    if (!queryText) return;
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: `🔄 ${queryText}` }]);
    await runQuery(queryText, { mode: regenerateMode || mode, regenerateOf });
  };

  const handleFollowUp = async (followUpText) => {
    if (!followUpText) return;
    setMessages(prev => [...prev, { id: Date.now(), type: 'user', text: followUpText }]);
    await runQuery(followUpText);
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full relative">

        {/* ── Chat messages area ── */}
        <div className="flex-1 overflow-y-auto min-h-0 relative z-10 pb-56 sm:pb-48">
          {messages.length === 0 ? (
            /* Welcome / command center */
            <div className="max-w-4xl mx-auto px-4 pt-10 pb-20">
              <CommandCenter onQuickAction={handleQuickAction} />
            </div>
          ) : (
            /* Conversation */
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
              {messages.map(msg =>
                msg.type === 'user' ? (
                  <UserMessage key={msg.id} text={msg.text} />
                ) : msg.type === 'assistant' ? (
                  <AssistantMessage
                    key={msg.id}
                    result={msg.result}
                    queryText={msg.queryText}
                    onFeedback={submitFeedback}
                    onRegenerate={(newMode) =>
                      handleRegenerate(msg.queryText, newMode, msg.result?.query_log_id)
                    }
                    onFollowUp={handleFollowUp}
                  />
                ) : (
                  <ErrorBubble key={msg.id} error={msg.text} />
                )
              )}

              {/* In-progress streaming bubble */}
              {isWorking && (
                <StreamingBubble
                  loading={loading}
                  streamingText={streamingText}
                  streaming={streaming}
                />
              )}

              {/* Scroll anchor */}
              <div ref={chatEndRef} className="h-1" />
            </div>
          )}
        </div>

        {/* ── Floating Island Input ── */}
        <div className="absolute bottom-6 left-0 right-0 px-4 pointer-events-none z-20">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <div className="glass-card p-3 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] border border-dark-700/80 bg-dark-900/80 backdrop-blur-2xl ring-1 ring-white/5 space-y-2 relative overflow-hidden">
              {/* Subtle inner glow for the island */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200px] h-[100px] bg-primary-500/10 blur-[40px] pointer-events-none" />

              {/* Mode picker */}
              <div className="flex items-center gap-1.5 flex-wrap px-1 relative z-10">
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider mr-0.5">Mode:</span>
                {MODE_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = mode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setMode(opt.value)}
                      title={opt.hint}
                      className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 border ${
                        active
                          ? 'bg-primary-600/20 text-primary-300 border-primary-500/40 shadow-sm shadow-primary-500/10'
                          : 'bg-dark-950/50 text-dark-500 border-dark-800/60 hover:text-dark-300 hover:border-dark-700'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Scope selector */}
              <div className="flex items-center gap-2 flex-wrap px-1 relative z-10">
                <span className="text-[10px] text-dark-500 font-bold uppercase tracking-wider">Search in:</span>
                {SCOPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setScope(opt.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-200 border ${
                      scope === opt.value
                        ? 'bg-primary-600/20 text-primary-400 border-primary-500/40 shadow-sm shadow-primary-500/10'
                        : 'bg-dark-950/50 text-dark-500 border-dark-800/60 hover:text-dark-300 hover:border-dark-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Query input */}
              <div className="relative z-10">
                <QueryInput
                  ref={queryInputRef}
                  onSubmit={handleQuery}
                  loading={isWorking}
                />
              </div>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
