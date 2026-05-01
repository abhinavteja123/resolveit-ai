import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
  History, ChevronDown, ChevronRight, ThumbsUp, ThumbsDown,
  Calendar, Clock, MessageSquarePlus, Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function confColor(score) {
  if (score >= 0.7) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  if (score >= 0.4) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  return 'text-red-400 bg-red-500/10 border-red-500/20';
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
      <main className="h-full flex flex-col max-w-6xl mx-auto w-full">
        
        {/* Header Section */}
        <div className="flex-shrink-0 px-8 py-8 border-b border-dark-800/40 bg-dark-950/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500/20 to-indigo-500/10 border border-sky-500/20 flex items-center justify-center shadow-inner">
                <History className="w-6 h-6 text-sky-400" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Query History</h1>
                <p className="text-dark-400 mt-1 font-medium">Review and resume your past AI resolution playbooks.</p>
              </div>
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center gap-3 bg-dark-900/50 p-1.5 rounded-xl border border-dark-800/60 shadow-inner">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 disabled:opacity-30 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-dark-400 min-w-[60px] text-center">Page {page}/{totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800 disabled:opacity-30 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Data Grid Section */}
        <div className="flex-1 overflow-auto relative scrollbar-thin scrollbar-thumb-dark-700 scrollbar-track-transparent pb-12">
          
          {loading && (
            <div className="p-8 space-y-3">
              {[...Array(8)].map((_, i) => <div key={i} className="h-16 bg-dark-800/20 animate-pulse rounded-xl" />)}
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <Clock className="w-16 h-16 text-dark-700 mb-4" />
              <p className="text-xl font-bold text-dark-500">No history found</p>
              <p className="text-dark-600 mt-2">Start a new query from the command center.</p>
            </div>
          )}

          {!loading && logs.length > 0 && (
            <div className="w-full min-w-[800px]">
              {/* Sticky Headers */}
              <div className="sticky top-0 z-20 grid grid-cols-12 gap-4 px-8 py-4 bg-dark-950/80 backdrop-blur-xl border-b border-dark-800/60 text-xs font-black uppercase tracking-widest text-dark-500 shadow-sm">
                <div className="col-span-6">Query Issue</div>
                <div className="col-span-2 text-center">Confidence</div>
                <div className="col-span-1 text-center">Turns</div>
                <div className="col-span-2 text-right">Date</div>
                <div className="col-span-1"></div>
              </div>

              {/* Grid Rows */}
              <div className="flex flex-col">
                {logs.map((log) => {
                  const expanded = expandedId === log.id;
                  const conf = Math.round((log.confidence_score || 0) * 100);
                  
                  return (
                    <div key={log.id} className="group border-b border-dark-800/30 hover:border-dark-700/50 transition-colors bg-dark-950/10">
                      
                      {/* Row Header (Clickable) */}
                      <button
                        onClick={() => setExpandedId(expanded ? null : log.id)}
                        className={cn(
                          "w-full grid grid-cols-12 gap-4 px-8 py-5 items-center text-left transition-colors duration-200",
                          expanded ? "bg-dark-900/40 shadow-inner" : "hover:bg-dark-900/20"
                        )}
                      >
                        {/* Query */}
                        <div className="col-span-6 flex items-center gap-4">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                            expanded ? "bg-primary-500/20 text-primary-400 rotate-90" : "bg-dark-800/50 text-dark-500 group-hover:bg-dark-700"
                          )}>
                            <ChevronRight className="w-4 h-4" />
                          </div>
                          <span className={cn("text-sm font-medium truncate", expanded ? "text-white" : "text-dark-200 group-hover:text-dark-100")}>
                            {log.query_text}
                          </span>
                        </div>

                        {/* Confidence Badge */}
                        <div className="col-span-2 flex justify-center">
                          <span className={cn("px-2.5 py-1 rounded-md text-[11px] font-bold border shadow-inner", confColor(log.confidence_score || 0))}>
                            {conf}% Match
                          </span>
                        </div>

                        {/* Turns */}
                        <div className="col-span-1 flex justify-center">
                          <span className="text-xs font-mono font-medium text-dark-400 bg-dark-900 px-2 py-1 rounded border border-dark-800 shadow-inner">
                            {log.turn_count || 1}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="col-span-2 flex justify-end items-center gap-2 text-dark-400 text-xs font-medium">
                          <Calendar className="w-3.5 h-3.5 opacity-50" />
                          {log.queried_at ? new Date(log.queried_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                        </div>

                        {/* Feedback/Actions icon */}
                        <div className="col-span-1 flex justify-end">
                          {log.feedback ? (
                            log.feedback.rating === 1 
                              ? <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20"><ThumbsUp className="w-3.5 h-3.5 text-emerald-400" /></div>
                              : <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20"><ThumbsDown className="w-3.5 h-3.5 text-red-400" /></div>
                          ) : (
                            <div className="w-7 h-7" /> // Spacer
                          )}
                        </div>
                      </button>

                      {/* Expandable Details */}
                      <AnimatePresence>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden bg-dark-950 shadow-inner"
                          >
                            <div className="p-8 border-t border-dark-800/40">
                              
                              <div className="flex items-center justify-between mb-6">
                                <h3 className="text-sm font-bold text-dark-300 flex items-center gap-2">
                                  <Sparkles className="w-4 h-4 text-primary-400" />
                                  Resolution Thread
                                </h3>
                                <button
                                  onClick={() => navigate('/dashboard', { state: { seed: buildSeed(log), threadId: log.id } })}
                                  className="flex items-center gap-2 text-xs font-bold text-white px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 shadow-[0_0_20px_-5px_rgba(var(--primary-500),0.5)] transition-all transform hover:scale-105"
                                >
                                  <MessageSquarePlus className="w-4 h-4" />
                                  Resume Thread
                                </button>
                              </div>

                              <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-[11px] before:w-px before:bg-dark-800/50">
                                {(log.turns || [log]).map((turn, ti) => (
                                  <div key={turn.id} className="relative pl-10">
                                    {/* Timeline dot */}
                                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-dark-900 border-2 border-dark-800 flex items-center justify-center z-10">
                                      <div className="w-2 h-2 rounded-full bg-dark-500" />
                                    </div>
                                    
                                    {/* User Query */}
                                    <div className="mb-3">
                                      <span className="text-xs font-black uppercase tracking-widest text-dark-500 mr-3">Prompt</span>
                                      <span className="text-sm text-dark-200 font-medium bg-dark-900/50 px-3 py-1.5 rounded-lg border border-dark-800">
                                        {turn.query_text}
                                      </span>
                                    </div>

                                    {/* AI Response Block */}
                                    <div className="bg-dark-900/60 border border-dark-800/60 rounded-2xl p-5 shadow-sm">
                                      <div className="text-sm text-dark-300 leading-relaxed font-mono whitespace-pre-wrap max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-dark-700">
                                        {turn.llm_response || 'No response recorded'}
                                      </div>
                                      
                                      {/* Sources */}
                                      {turn.retrieved_sources?.length > 0 && (
                                        <div className="mt-5 pt-4 border-t border-dark-800/40">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-dark-600 mb-2">Sources Referenced</p>
                                          <div className="flex flex-wrap gap-2">
                                            {turn.retrieved_sources.map((src, si) => (
                                              <span key={si} className="text-[11px] font-medium text-dark-400 bg-dark-950 px-2.5 py-1 rounded-md border border-dark-800 shadow-inner">
                                                {src}
                                              </span>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>

                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </AppLayout>
  );
}

