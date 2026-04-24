import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  History, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown,
  Calendar, ChevronLeft, ChevronRight, Clock, MessageSquarePlus,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function confColor(score) {
  if (score >= 0.7) return 'text-emerald-400';
  if (score >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

function confAccent(score) {
  if (score >= 0.7) return 'border-l-emerald-500/40';
  if (score >= 0.4) return 'border-l-amber-500/40';
  return 'border-l-red-500/40';
}

function buildSeed(log) {
  const turns = log.turns && log.turns.length > 0 ? log.turns : [log];
  return turns.flatMap((turn, i) => [
    { id: i * 2 + 1, type: 'user', text: turn.query_text },
    {
      id: i * 2 + 2,
      type: 'assistant',
      queryText: turn.query_text,
      result: {
        answer: turn.llm_response || '',
        sources: (turn.retrieved_sources || []).map(s => ({ filename: s })),
        top_confidence: turn.confidence_score || 0,
        query_log_id: turn.id,
      },
    },
  ]);
}

export default function QueryHistory() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/history`, {
          params: { page, per_page: 15 },
          headers: { Authorization: `Bearer ${token}` },
        });
        setLogs(res.data.logs || []);
        setTotalPages(res.data.total_pages || 0);
      } catch {}
      finally { setLoading(false); }
    };
    fetch();
  }, [token, page]);

  return (
    <AppLayout>
      <main className="max-w-4xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-8">
          <div className="page-header-icon bg-sky-500/10 border border-sky-500/20">
            <History className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">Query History</h1>
            <p className="text-sm text-dark-600">Your past queries and AI responses</p>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
          </div>
        )}

        {!loading && logs.length === 0 && (
          <div className="glass-card p-14 text-center">
            <Clock className="w-10 h-10 text-dark-700 mx-auto mb-3" />
            <p className="text-dark-500 font-medium">No queries yet</p>
            <p className="text-dark-700 text-sm mt-1">Your history will appear here after your first query</p>
          </div>
        )}

        {!loading && logs.length > 0 && (
          <div className="space-y-2">
            {logs.map((log) => {
              const expanded = expandedId === log.id;
              const conf = Math.round((log.confidence_score || 0) * 100);
              return (
                <div
                  key={log.id}
                  className={`glass-card overflow-hidden border-l-2 transition-all duration-200 ${confAccent(log.confidence_score || 0)}`}
                >
                  <button
                    onClick={() => setExpandedId(expanded ? null : log.id)}
                    className="w-full px-5 py-3.5 flex items-center justify-between gap-4 text-left hover:bg-dark-900/40 transition-colors"
                  >
                    <p className="text-sm font-medium text-dark-300 truncate flex-1">{log.query_text}</p>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {log.turn_count > 1 && (
                        <span className="text-[10px] text-dark-500 bg-dark-800/60 px-1.5 py-0.5 rounded font-mono border border-dark-700/50">
                          {log.turn_count} turns
                        </span>
                      )}
                      {log.feedback && (
                        log.feedback.rating === 1
                          ? <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                          : <ThumbsDown className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className={`text-xs font-mono font-semibold ${confColor(log.confidence_score || 0)}`}>
                        {conf}%
                      </span>
                      <div className="flex items-center gap-1 text-dark-700 text-xs">
                        <Calendar className="w-3 h-3" />
                        {log.queried_at ? new Date(log.queried_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </div>
                      {expanded ? <ChevronUp className="w-3.5 h-3.5 text-dark-700" /> : <ChevronDown className="w-3.5 h-3.5 text-dark-700" />}
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-5 pb-5 border-t border-dark-800/50 animate-slide-down">
                      <div className="flex items-center justify-between mt-4 mb-3">
                        <p className="text-[11px] font-semibold text-dark-600 uppercase tracking-widest">
                          {log.turn_count > 1 ? `Thread · ${log.turn_count} turns` : 'AI Response'}
                        </p>
                        <button
                          onClick={() => navigate('/dashboard', { state: { seed: buildSeed(log), threadId: log.id } })}
                          className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300 transition-colors px-2.5 py-1 rounded-lg bg-primary-600/10 hover:bg-primary-600/20 border border-primary-600/20"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5" />
                          Continue Chat
                        </button>
                      </div>

                      {(log.turns || [log]).map((turn, ti) => (
                        <div key={turn.id} className={ti > 0 ? 'mt-4 pt-4 border-t border-dark-800/30' : ''}>
                          {log.turn_count > 1 && ti > 0 && (
                            <div className="text-xs text-dark-400 bg-primary-600/10 border border-primary-600/20 rounded-lg px-3 py-2 mb-2 italic">
                              Q: {turn.query_text}
                            </div>
                          )}
                          <div className="text-sm text-dark-400 leading-relaxed whitespace-pre-wrap bg-dark-950/50 rounded-xl p-4 max-h-72 overflow-y-auto border border-dark-800/50 font-mono text-xs">
                            {turn.llm_response || 'No response recorded'}
                          </div>
                          {turn.retrieved_sources?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-[11px] text-dark-700 mb-1.5">Sources</p>
                              <div className="flex flex-wrap gap-1.5">
                                {turn.retrieved_sources.map((src, si) => (
                                  <span key={si} className="text-xs text-dark-500 bg-dark-900/60 px-2 py-0.5 rounded-md border border-dark-800/50">
                                    {src}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {turn.feedback && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-dark-600">
                              {turn.feedback.rating === 1
                                ? <ThumbsUp className="w-3 h-3 text-emerald-400" />
                                : <ThumbsDown className="w-3 h-3 text-red-400" />
                              }
                              Feedback submitted{turn.feedback.comment && `: "${turn.feedback.comment}"`}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary flex items-center gap-1.5 disabled:opacity-30">
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <span className="text-xs text-dark-600">Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary flex items-center gap-1.5 disabled:opacity-30">
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
