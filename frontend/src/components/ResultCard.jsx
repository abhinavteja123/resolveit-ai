import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import SourceBadge from './SourceBadge';
import FeedbackButtons from './FeedbackButtons';
import {
  FileText, Bookmark, Link2, Copy, Check,
  CheckCircle2, Circle, ChevronDown, ChevronUp,
  LayoutList, AlignLeft, ShieldCheck, AlertTriangle, Info,
} from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const mdComponents = {
  p:      ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ol:     ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  ul:     ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  li:     ({ children }) => <li className="text-dark-300">{children}</li>,
  strong: ({ children }) => <strong className="text-dark-100 font-semibold">{children}</strong>,
  code:   ({ children }) => (
    <code className="bg-dark-800/80 px-1.5 py-0.5 rounded text-xs font-mono text-primary-300 border border-dark-700/50">
      {children}
    </code>
  ),
};

function parseAnswer(answer) {
  if (!answer) return { hasStructure: false, raw: answer };
  const stepPattern = /^\s*\d+\.\s+([\s\S]+?)(?=\n\s*\d+\.|\n\s*\*\*|\n\s*#{1,6}\s|$)/gm;
  const steps = [];
  let m;
  while ((m = stepPattern.exec(answer)) !== null) {
    const text = m[1].trim();
    if (text) steps.push(text);
  }
  if (steps.length < 2) return { hasStructure: false, raw: answer };
  const firstStepIdx = answer.search(/^\s*1\.\s/m);
  const intro = firstStepIdx > 0 ? answer.slice(0, firstStepIdx).trim() : null;
  const prevMatch = answer.match(/\*\*Prevention Tips?\*\*[\s\n]+([\s\S]+)$/i);
  const prevention = prevMatch ? prevMatch[1].trim() : null;
  return { hasStructure: true, intro, steps, prevention, raw: answer };
}

export default function ResultCard({ result, onFeedback, queryText = '' }) {
  if (!result) return null;

  const { answer, sources, top_confidence, query_log_id } = result;
  const { token } = useAuth();

  const [wizardMode, setWizardMode] = useState(true);
  const [checkedSteps, setCheckedSteps] = useState([]);
  const [preventionOpen, setPreventionOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarking, setBookmarking] = useState(false);
  const [copied, setCopied] = useState(false);

  const parsed = parseAnswer(answer);
  const uniqueSources = sources
    ? Object.values(sources.reduce((acc, s) => { if (!acc[s.filename]) acc[s.filename] = s; return acc; }, {}))
    : [];

  const escalationPhrase = 'No relevant information in the indexed runbooks';
  const answerIsEscalation = typeof answer === 'string' && answer.trim().startsWith(escalationPhrase);
  const isNoMatch = uniqueSources.length === 0 || answerIsEscalation;
  if (isNoMatch) {
    return (
      <div className="w-full max-w-3xl mx-auto animate-slide-up">
        <div className="glass-card px-5 py-5 flex gap-3 items-start border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-amber-400 font-semibold mb-1">
              No matching runbook
            </div>
            <div className="text-sm text-dark-300 leading-relaxed">
              {answer || 'No relevant information in the indexed runbooks — please escalate to Tier-2.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const confidencePercent = Math.round(top_confidence * 100);
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

  return (
    <div className="w-full max-w-3xl mx-auto animate-slide-up">
      <div className="glass-card overflow-hidden">

        {/* ── Header ── */}
        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3 border-b border-dark-800/50">
          {/* Confidence badge */}
          <div className="flex items-center gap-2">
            <ConfIcon className={`w-4 h-4 ${confIconColor}`} />
            <div className="w-20 h-1.5 bg-dark-800/80 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${confidenceClass} transition-all duration-1000`} style={{ width: `${confidencePercent}%` }} />
            </div>
            <span className={`text-xs font-semibold font-mono ${confIconColor}`}>{confidencePercent}%</span>
            <span className="text-xs text-dark-600">{confidenceLabel} confidence</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {parsed.hasStructure && (
              <button
                onClick={() => setWizardMode(m => !m)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-dark-500 hover:text-dark-300 hover:bg-dark-800/60 border border-dark-800/50 transition-all"
                title={wizardMode ? 'Switch to raw text' : 'Switch to step wizard'}
              >
                {wizardMode ? <AlignLeft className="w-3.5 h-3.5" /> : <LayoutList className="w-3.5 h-3.5" />}
                {wizardMode ? 'Raw' : 'Steps'}
              </button>
            )}
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-lg transition-all ${copied ? 'text-emerald-400 bg-emerald-500/10' : 'text-dark-600 hover:text-dark-300 hover:bg-dark-800/60'}`}
              title="Copy response text"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleCopyLink}
              className="p-1.5 rounded-lg text-dark-600 hover:text-dark-300 hover:bg-dark-800/60 transition-all"
              title="Copy shareable link"
            >
              <Link2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleBookmark}
              disabled={bookmarked || bookmarking || !query_log_id}
              className={`p-1.5 rounded-lg transition-all ${bookmarked ? 'text-primary-400 bg-primary-600/10' : 'text-dark-600 hover:text-primary-400 hover:bg-primary-600/10'}`}
              title={bookmarked ? 'Saved' : 'Save to Playbook'}
            >
              <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-primary-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── Answer content ── */}
        <div className="px-5 py-5">
          {parsed.hasStructure && wizardMode ? (
            <div className="space-y-3">
              {parsed.intro && (
                <div className="text-sm text-dark-400 leading-relaxed">
                  <ReactMarkdown components={mdComponents}>{parsed.intro}</ReactMarkdown>
                </div>
              )}

              {totalSteps > 1 && (
                <div className="flex items-center gap-3 py-0.5">
                  <div className="flex-1 h-1 bg-dark-800/70 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-600 transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-dark-600 font-mono whitespace-nowrap">
                    {checkedSteps.length}/{totalSteps}
                  </span>
                </div>
              )}

              {parsed.steps.map((step, i) => {
                const done = checkedSteps.includes(i);
                return (
                  <div key={i} className={`step-card ${done ? 'step-done' : ''}`}>
                    <button onClick={() => toggleStep(i)} className="flex-shrink-0 mt-0.5">
                      {done
                        ? <CheckCircle2 className="w-4.5 h-4.5 w-[18px] h-[18px] text-emerald-400" />
                        : <Circle className="w-[18px] h-[18px] text-dark-700 hover:text-primary-400 transition-colors" />
                      }
                    </button>
                    <div className={`flex-1 text-sm leading-relaxed min-w-0 ${done ? 'opacity-40' : 'text-dark-300'}`}>
                      <span className="text-[10px] font-bold text-dark-600 mr-1.5 uppercase tracking-wider">Step {i + 1}</span>
                      <span className={done ? 'line-through text-dark-600' : ''}>
                        <ReactMarkdown components={mdComponents}>{step}</ReactMarkdown>
                      </span>
                    </div>
                  </div>
                );
              })}

              {parsed.prevention && (
                <div className="rounded-xl border border-dark-800/50 overflow-hidden mt-1">
                  <button
                    onClick={() => setPreventionOpen(o => !o)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-primary-400 hover:bg-dark-900/60 transition-colors"
                  >
                    <span>Prevention Tips</span>
                    {preventionOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {preventionOpen && (
                    <div className="px-4 pb-4 pt-1 text-sm text-dark-400 border-t border-dark-800/50 animate-slide-down">
                      <ReactMarkdown components={mdComponents}>{parsed.prevention}</ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none text-dark-300 leading-relaxed">
              <ReactMarkdown components={mdComponents}>{answer}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* ── Sources ── */}
        {uniqueSources.length > 0 && (
          <div className="px-5 pb-4 border-t border-dark-800/40 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5 text-dark-700" />
              <span className="text-[11px] font-semibold text-dark-600 uppercase tracking-widest">
                Sources ({uniqueSources.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {uniqueSources.map((source, i) => <SourceBadge key={i} source={source} />)}
            </div>
          </div>
        )}

        {/* ── Feedback ── */}
        <div className="px-5 py-4 border-t border-dark-800/40">
          <FeedbackButtons queryLogId={query_log_id} onSubmit={onFeedback} />
        </div>
      </div>
    </div>
  );
}
