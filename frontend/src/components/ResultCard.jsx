import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import SourceBadge from './SourceBadge';
import FeedbackButtons from './FeedbackButtons';
import {
  FileText, Bookmark, Link2, Copy, Check,
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  LayoutList, AlignLeft, ShieldCheck, AlertTriangle, Info, Terminal,
  Download, RotateCw, Sparkles, MessageCircleQuestion,
  Zap, Brain, Lightbulb, ShieldAlert, GraduationCap
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// --- Custom Code Block Component ---
function CodeBlock({ language, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-dark-700/60 bg-dark-950/80 shadow-lg group">
      <div className="flex items-center justify-between px-4 py-2 bg-dark-900/80 border-b border-dark-800/50">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-dark-500" />
          <span className="text-[10px] font-mono font-bold text-dark-400 uppercase tracking-widest">
            {language || 'bash'}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-dark-800/50 text-dark-400 hover:text-dark-200 hover:bg-dark-700/50 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          <span className="text-[10px] font-medium">{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="text-xs font-mono text-dark-200 leading-relaxed">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
}

const mdComponents = {
  p:      ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>,
  ol:     ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1.5">{children}</ol>,
  ul:     ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1.5">{children}</ul>,
  li:     ({ children }) => <li className="text-dark-300 pl-1">{children}</li>,
  strong: ({ children }) => <strong className="text-dark-100 font-bold">{children}</strong>,
  code({node, inline, className, children, ...props}) {
    const match = /language-(\w+)/.exec(className || '')
    return !inline ? (
      <CodeBlock language={match?.[1]} value={String(children).replace(/\n$/, '')} />
    ) : (
      <code className="bg-primary-600/10 px-1.5 py-0.5 rounded-[4px] text-[11px] font-mono text-primary-300 border border-primary-500/20 shadow-sm" {...props}>
        {children}
      </code>
    )
  }
};

// Strip inline citation markers like [1], [2], [1, 2], etc.
function cleanCitations(text) {
  return text
    .replace(/\[\d+(?:,\s*\d+)*\]/g, '') // remove [1], [2, 3], etc.
    .replace(/\s{2,}/g, ' ')              // collapse extra spaces
    .trim();
}

function parseAnswer(answer) {
  if (!answer) return { hasStructure: false, raw: answer };

  // Split on top-level numbered items: lines that start with a digit, period, space
  // Uses a lookahead so we keep the delimiter to re-attach step numbers
  const segments = answer.split(/(?=^\s*\d+\.\s)/m);

  // Extract intro (everything before the first numbered item)
  const firstNumberedIdx = answer.search(/^\s*\d+\.\s/m);
  const intro = firstNumberedIdx > 0 ? cleanCitations(answer.slice(0, firstNumberedIdx).trim()) : null;

  const steps = [];
  for (const seg of segments) {
    // Only process segments that actually start with a number
    const match = seg.match(/^\s*\d+\.\s+([\s\S]+)/m);
    if (match) {
      // Get ALL the content after the "N. " prefix — no cutoff
      const raw = match[1].trimEnd();
      // Strip citations from prose (not inside code fences)
      const cleaned = raw.replace(/(?<!```[\s\S]*?)\[\d+(?:,\s*\d+)*\](?![\s\S]*?```)/g, '').trimEnd();
      if (cleaned.trim()) steps.push(cleaned.trim());
    }
  }

  if (steps.length < 2) return { hasStructure: false, raw: cleanCitations(answer) };

  // Pull out prevention/follow-up section at the end if present
  const prevMatch = answer.match(/\*\*Prevention(?:[\s\S]*?)\*\*[\s\n]+([\s\S]+)$/i);
  const prevention = prevMatch ? cleanCitations(prevMatch[1].trim()) : null;
  // Remove prevention from last step if it got included
  if (prevention && steps.length > 0) {
    const lastStep = steps[steps.length - 1];
    const prevIdx = lastStep.search(/\*\*Prevention/i);
    if (prevIdx !== -1) steps[steps.length - 1] = lastStep.slice(0, prevIdx).trim();
  }

  return { hasStructure: true, intro, steps, prevention, raw: cleanCitations(answer) };
}

// Framer Motion Variants
const stepVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

const MODE_META = {
  fast:     { icon: Zap,           label: 'Fast' },
  standard: { icon: Sparkles,      label: 'Standard' },
  deep:     { icon: Brain,         label: 'Deep' },
  eli5:     { icon: GraduationCap, label: 'ELI5' },
  expert:   { icon: Lightbulb,     label: 'Expert' },
  dryrun:   { icon: ShieldAlert,   label: 'Dry-run' },
};

const REGEN_MODES = ['fast', 'standard', 'deep', 'eli5', 'expert', 'dryrun'];

export default function ResultCard({ result, onFeedback, queryText = '', onRegenerate, onFollowUp }) {
  if (!result) return null;

  const { answer, sources, top_confidence, query_log_id, mode, follow_ups } = result;
  const { token } = useAuth();

  const [wizardMode, setWizardMode] = useState(true);
  const [checkedSteps, setCheckedSteps] = useState([]);
  const [preventionOpen, setPreventionOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);

  const ModeIcon = mode && MODE_META[mode] ? MODE_META[mode].icon : null;
  const modeLabel = mode && MODE_META[mode] ? MODE_META[mode].label : null;
  const followUps = Array.isArray(follow_ups) ? follow_ups : [];

  // Animate confidence bar on mount
  const [confWidth, setConfWidth] = useState(0);
  const confidencePercent = Math.round(top_confidence * 100);
  useEffect(() => {
    const t = setTimeout(() => setConfWidth(confidencePercent), 100);
    return () => clearTimeout(t);
  }, [confidencePercent]);

  const parsed = parseAnswer(answer);
  const uniqueSources = sources
    ? Object.values(sources.reduce((acc, s) => { if (!acc[s.filename]) acc[s.filename] = s; return acc; }, {}))
    : [];

  const escalationPhrase = 'No relevant information in the indexed runbooks';
  const answerIsEscalation = typeof answer === 'string' && answer.trim().startsWith(escalationPhrase);
  const isNoMatch = uniqueSources.length === 0 || answerIsEscalation;
  
  if (isNoMatch) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
        <div className="glass-card px-5 py-5 flex gap-4 items-start border border-amber-500/30 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.05)]">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1 mt-0.5">
            <div className="text-xs uppercase tracking-widest text-amber-500 font-bold mb-1.5">
              No matching runbook
            </div>
            <div className="text-sm text-dark-200 font-medium leading-relaxed">
              {answer || 'No relevant information in the indexed runbooks — please escalate to Tier-2.'}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const confidenceClass = top_confidence >= 0.7 ? 'confidence-high' : top_confidence >= 0.4 ? 'confidence-medium' : 'confidence-low';
  const ConfIcon = top_confidence >= 0.7 ? ShieldCheck : top_confidence >= 0.4 ? Info : AlertTriangle;
  const confIconColor = top_confidence >= 0.7 ? 'text-emerald-400' : top_confidence >= 0.4 ? 'text-amber-400' : 'text-red-400';
  const confidenceLabel = top_confidence >= 0.7 ? 'High' : top_confidence >= 0.4 ? 'Medium' : 'Low';

  const toggleStep = (i) =>
    setCheckedSteps(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]);

  const totalSteps = parsed.hasStructure ? parsed.steps.length : 0;
  const progressPct = totalSteps > 0 ? Math.round((checkedSteps.length / totalSteps) * 100) : 0;

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); })
      .catch(() => toast.error('Copy failed'));
  };

  const handleBookmark = async () => {
    if (bookmarked || bookmarking || !query_log_id) return;
    setBookmarking(true);
    try {
      await axios.post(
        `${API_BASE}/bookmarks`,
        { query_log_id, query_text: queryText, answer_snippet: answer?.slice(0, 300) || '', sources: uniqueSources.map(s => s.filename) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBookmarked(true);
      toast.success('Saved to your Playbook');
    } catch {
      toast.error('Bookmark failed');
    } finally {
      setBookmarking(false);
    }
  };

  const handleCopyLink = () => {
    if (!query_log_id) return;
    navigator.clipboard
      .writeText(`${window.location.origin}/answer/${query_log_id}`)
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Copy failed'));
  };

  const handleExportMarkdown = async () => {
    if (!query_log_id) return;
    try {
      const res = await fetch(`${API_BASE}/export/${query_log_id}.md`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const filename =
        res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ||
        `${(queryText || 'answer').slice(0, 40).replace(/\s+/g, '-')}.md`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Markdown downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const handleRegenerate = (newMode) => {
    setRegenOpen(false);
    if (!onRegenerate) return;
    onRegenerate(newMode);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
      <div className="glass-card overflow-hidden">
        
        {/* Subtle background glow based on confidence */}
        <div className={`absolute -top-32 -right-32 w-64 h-64 blur-[80px] pointer-events-none ${
          top_confidence >= 0.7 ? 'bg-emerald-500/10' : top_confidence >= 0.4 ? 'bg-amber-500/10' : 'bg-red-500/10'
        }`} />

        {/* ── Header ── */}
        <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-4 border-b border-dark-800/50 bg-dark-900/30">
          {/* Confidence badge */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-inner ${
              top_confidence >= 0.7 ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-emerald-500/10' :
              top_confidence >= 0.4 ? 'bg-amber-500/10 border border-amber-500/20 shadow-amber-500/10' :
              'bg-red-500/10 border border-red-500/20 shadow-red-500/10'
            }`}>
              <ConfIcon className={`w-4 h-4 ${confIconColor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] uppercase font-extrabold tracking-widest ${confIconColor}`}>{confidenceLabel} Confidence</span>
                <span className="text-[10px] font-mono text-dark-500">{confidencePercent}%</span>
                {ModeIcon && (
                  <span
                    className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary-500/10 border border-primary-500/20 text-[9px] uppercase tracking-widest text-primary-300 font-bold"
                    title={`Generated in ${modeLabel} mode`}
                  >
                    <ModeIcon className="w-2.5 h-2.5" />
                    {modeLabel}
                  </span>
                )}
              </div>
              <div className="w-32 h-1.5 bg-dark-800/80 rounded-full overflow-hidden shadow-inner">
                <div className={`h-full rounded-full ${confidenceClass} transition-all duration-1000 ease-out`} style={{ width: `${confWidth}%` }} />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 bg-dark-950/50 p-1 rounded-xl border border-dark-800/60 shadow-inner">
            {parsed.hasStructure && (
              <button
                onClick={() => setWizardMode(m => !m)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-colors"
                title={wizardMode ? 'Switch to raw text' : 'Switch to step wizard'}
              >
                {wizardMode ? <AlignLeft className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                {wizardMode ? 'Raw' : 'Steps'}
              </button>
            )}
            <div className="w-px h-4 bg-dark-700/50 mx-1" />
            <button
              onClick={handleCopy}
              className={`p-2 rounded-lg transition-all ${copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-dark-400 hover:text-dark-100 hover:bg-dark-800'}`}
              title="Copy response text"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              onClick={handleCopyLink}
              className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all"
              title="Copy shareable link"
            >
              <Link2 className="w-4 h-4" />
            </button>
            <button
              onClick={handleBookmark}
              disabled={bookmarked || bookmarking || !query_log_id}
              className={`p-2 rounded-lg transition-all ${bookmarked ? 'text-primary-400 bg-primary-600/10' : 'text-dark-400 hover:text-primary-400 hover:bg-primary-600/10'}`}
              title={bookmarked ? 'Saved' : 'Save to Playbook'}
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-primary-400' : ''}`} />
            </button>
            <button
              onClick={handleExportMarkdown}
              disabled={!query_log_id}
              className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Download as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
            {onRegenerate && (
              <div className="relative">
                <button
                  onClick={() => setRegenOpen(o => !o)}
                  className="p-2 rounded-lg text-dark-400 hover:text-dark-100 hover:bg-dark-800 transition-all"
                  title="Try again in another mode"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <AnimatePresence>
                  {regenOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 mt-2 w-44 z-30 rounded-xl border border-dark-700/80 bg-dark-900/95 backdrop-blur-md shadow-xl py-1"
                    >
                      <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-dark-500 font-bold">
                        Regenerate as
                      </div>
                      {REGEN_MODES.map((m) => {
                        const Meta = MODE_META[m];
                        const Icon = Meta?.icon;
                        return (
                          <button
                            key={m}
                            onClick={() => handleRegenerate(m)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-dark-200 hover:bg-primary-500/10 hover:text-primary-300 transition-colors"
                          >
                            {Icon && <Icon className="w-3.5 h-3.5" />}
                            {Meta?.label || m}
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* ── Answer content ── */}
        <div className="px-6 py-6">
          {parsed.hasStructure && wizardMode ? (
            <div className="space-y-5">
              {parsed.intro && (
                <div className="text-sm text-dark-300 leading-relaxed font-medium">
                  <ReactMarkdown components={mdComponents}>{parsed.intro}</ReactMarkdown>
                </div>
              )}

              {totalSteps > 1 && (
                <div className="flex items-center gap-4 py-2 border-y border-dark-800/40">
                  <span className="text-[10px] text-dark-500 font-bold uppercase tracking-widest whitespace-nowrap">
                    Resolution Progress
                  </span>
                  <div className="flex-1 h-2 bg-dark-900 rounded-full overflow-hidden border border-dark-800/50 shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-600 to-primary-400 transition-all duration-500 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-primary-400 font-mono font-bold whitespace-nowrap bg-primary-500/10 px-2 py-0.5 rounded-md border border-primary-500/20">
                    {checkedSteps.length}/{totalSteps}
                  </span>
                </div>
              )}

              <div className="space-y-3">
                {parsed.steps.map((step, i) => {
                  const done = checkedSteps.includes(i);
                  return (
                    <motion.div 
                      key={i} 
                      variants={stepVariants}
                      initial="hidden"
                      animate="visible"
                      transition={{ delay: i * 0.1 }}
                      className={`relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300 overflow-hidden ${
                        done 
                          ? 'bg-emerald-500/[0.02] border-emerald-500/20 shadow-inner' 
                          : 'bg-dark-950/40 border-dark-800/60 hover:border-dark-700/80 hover:bg-dark-900/40 shadow-md'
                      }`}
                    >
                      {/* Generative UI: Subtle progress background fill for completed steps */}
                      {done && (
                        <motion.div 
                          initial={{ scaleX: 0 }} 
                          animate={{ scaleX: 1 }} 
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent origin-left pointer-events-none" 
                        />
                      )}

                      <button onClick={() => toggleStep(i)} className="flex-shrink-0 mt-1 relative z-10 group">
                        {done ? (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          </motion.div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-dark-600 group-hover:border-primary-400 group-hover:bg-primary-500/10 transition-colors flex items-center justify-center" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 relative z-10">
                        {/* Step header row */}
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-black border ${
                            done
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-dark-800 border-dark-700 text-dark-400'
                          }`}>{i + 1}</span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${done ? 'text-emerald-500/80' : 'text-dark-500'}`}>
                            {done ? '✓ Completed' : `Step ${i + 1}`}
                          </span>
                        </div>

                        {/* Step body — pass through ReactMarkdown, line-through only on paragraphs */}
                        <div className={`text-sm leading-relaxed transition-opacity duration-300 ${done ? 'opacity-50' : 'text-dark-200'}`}>
                          <ReactMarkdown
                            components={{
                              ...mdComponents,
                              p: ({ children }) => (
                                <p className={`mb-2 last:mb-0 leading-relaxed ${
                                  done ? 'line-through decoration-emerald-500/50 decoration-1' : ''
                                }`}>{children}</p>
                              ),
                              li: ({ children }) => (
                                <li className={`text-dark-300 pl-1 ${
                                  done ? 'line-through decoration-emerald-500/50 decoration-1 opacity-70' : ''
                                }`}>{children}</li>
                              ),
                            }}
                          >{step}</ReactMarkdown>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {parsed.prevention && (
                <div className="rounded-2xl border border-sky-500/20 overflow-hidden mt-4 bg-sky-500/5 shadow-inner">
                  <button
                    onClick={() => setPreventionOpen(o => !o)}
                    className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-sky-400 hover:bg-sky-500/10 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4" />
                      Prevention & Follow-up
                    </span>
                    {preventionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <AnimatePresence>
                    {preventionOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-5 pb-5 text-sm text-dark-300 border-t border-sky-500/10"
                      >
                        <div className="pt-3">
                          <ReactMarkdown components={mdComponents}>{parsed.prevention}</ReactMarkdown>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-dark-200 leading-relaxed font-medium">
              <ReactMarkdown components={mdComponents}>{answer}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* ── Sources ── */}
        {uniqueSources.length > 0 && (
          <div className="px-6 pb-5 border-t border-dark-800/40 pt-5 bg-dark-950/30">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-md bg-dark-800 flex items-center justify-center border border-dark-700">
                <FileText className="w-3.5 h-3.5 text-dark-400" />
              </div>
              <span className="text-[11px] font-bold text-dark-500 uppercase tracking-widest">
                Referenced Runbooks
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uniqueSources.map((source, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                  <SourceBadge source={source} />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Follow-up suggestions ── */}
        {onFollowUp && followUps.length > 0 && (
          <div className="px-6 pt-5 pb-2 border-t border-dark-800/40 bg-dark-900/30">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-primary-500/10 flex items-center justify-center border border-primary-500/20">
                <MessageCircleQuestion className="w-3.5 h-3.5 text-primary-300" />
              </div>
              <span className="text-[11px] font-bold text-primary-300 uppercase tracking-widest">
                Suggested Follow-ups
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {followUps.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onFollowUp(q)}
                  className="text-left max-w-full text-[12px] leading-snug px-3 py-2 rounded-xl border border-dark-700/70 bg-dark-950/40 text-dark-300 hover:text-primary-200 hover:border-primary-500/40 hover:bg-primary-500/5 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Feedback ── */}
        <div className="px-6 py-4 border-t border-dark-800/40 bg-dark-900/50 flex justify-end">
          <FeedbackButtons queryLogId={query_log_id} onSubmit={onFeedback} />
        </div>
      </div>
    </motion.div>
  );
}
