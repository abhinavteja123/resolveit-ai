import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  History,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  ThumbsDown,
  Search,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function QueryHistory() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_BASE}/history`, {
          params: { page, per_page: 15 },
          headers: { Authorization: `Bearer ${token}` },
        });
        setLogs(res.data.logs || []);
        setTotalPages(res.data.total_pages || 0);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [token, page]);

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const confidenceClass = (score) => {
    if (score >= 0.7) return 'text-emerald-400';
    if (score >= 0.4) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Query History</h1>
            <p className="text-sm text-dark-500">Your past queries and AI responses</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && logs.length === 0 && (
          <div className="glass-card p-12 text-center">
            <Clock className="w-12 h-12 text-dark-600 mx-auto mb-3" />
            <p className="text-dark-400 text-lg">No queries yet</p>
            <p className="text-dark-600 text-sm mt-1">Your query history will appear here</p>
          </div>
        )}

        {/* Logs list */}
        {!loading && logs.length > 0 && (
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="glass-card overflow-hidden transition-all duration-300"
              >
                {/* Header row */}
                <button
                  onClick={() => toggleExpand(log.id)}
                  className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-dark-800/20 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Search className="w-4 h-4 text-dark-500 flex-shrink-0" />
                    <p className="text-sm font-medium text-dark-200 truncate">
                      {log.query_text}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Feedback icon */}
                    {log.feedback && (
                      <div>
                        {log.feedback.rating === 1 ? (
                          <ThumbsUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ThumbsDown className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    )}

                    {/* Confidence */}
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-dark-600" />
                      <span
                        className={`text-xs font-mono ${confidenceClass(
                          log.confidence_score
                        )}`}
                      >
                        {Math.round((log.confidence_score || 0) * 100)}%
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-dark-600 text-xs">
                      <Calendar className="w-3.5 h-3.5" />
                      {log.queried_at
                        ? new Date(log.queried_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
                    </div>

                    {/* Expand icon */}
                    {expandedId === log.id ? (
                      <ChevronUp className="w-4 h-4 text-dark-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-dark-500" />
                    )}
                  </div>
                </button>

                {/* Expanded content */}
                {expandedId === log.id && (
                  <div className="px-5 pb-5 border-t border-dark-700/30 animate-slide-down">
                    <div className="pt-4">
                      <p className="text-xs font-semibold text-dark-500 uppercase tracking-wider mb-2">
                        AI Response
                      </p>
                      <div className="text-sm text-dark-300 leading-relaxed whitespace-pre-wrap bg-dark-900/40 rounded-xl p-4 max-h-80 overflow-y-auto">
                        {log.llm_response || 'No response recorded'}
                      </div>

                      {/* Sources */}
                      {log.retrieved_sources?.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs text-dark-500 mb-1.5">Sources:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {log.retrieved_sources.map((src, i) => (
                              <span
                                key={i}
                                className="badge bg-dark-800/80 text-dark-400 border border-dark-700/50"
                              >
                                {src}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback info */}
                      {log.feedback && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-dark-500">
                          {log.feedback.rating === 1 ? (
                            <ThumbsUp className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <ThumbsDown className="w-3 h-3 text-red-400" />
                          )}
                          Feedback submitted
                          {log.feedback.comment && `: "${log.feedback.comment}"`}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary flex items-center gap-1.5 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <span className="text-sm text-dark-500">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary flex items-center gap-1.5 disabled:opacity-30"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
