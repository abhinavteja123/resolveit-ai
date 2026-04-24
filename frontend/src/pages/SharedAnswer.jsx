import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import { FileText, BookOpen, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

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

export default function SharedAnswer() {
  const { id } = useParams();
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token || !id) return;
    axios.get(`${API_BASE}/answer/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.data?.detail || 'Answer not found'))
      .finally(() => setLoading(false));
  }, [token, id]);

  const conf = data ? Math.round((data.top_confidence || 0) * 100) : 0;
  const confClass = (data?.top_confidence || 0) >= 0.7 ? 'confidence-high' : (data?.top_confidence || 0) >= 0.4 ? 'confidence-medium' : 'confidence-low';
  const ConfIcon = (data?.top_confidence || 0) >= 0.7 ? ShieldCheck : Info;
  const confIconColor = (data?.top_confidence || 0) >= 0.7 ? 'text-emerald-400' : (data?.top_confidence || 0) >= 0.4 ? 'text-amber-400' : 'text-red-400';

  return (
    <AppLayout>
      <main className="max-w-3xl mx-auto px-4 py-8">

        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="skeleton h-4 w-1/4 rounded" />
            <div className="skeleton h-6 w-2/3 rounded" />
            <div className="skeleton h-56 w-full rounded-2xl" />
          </div>
        )}

        {error && !loading && (
          <div className="glass-card p-10 text-center animate-fade-in">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <p className="text-red-400 font-medium">{error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center gap-2 text-xs text-dark-700">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Shared Answer</span>
            </div>

            <p className="text-lg font-semibold text-dark-200 leading-snug">
              "{data.query_text}"
            </p>

            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-dark-800/50 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <ConfIcon className={`w-4 h-4 ${confIconColor}`} />
                  <div className="w-20 h-1.5 bg-dark-800/80 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${confClass} transition-all duration-1000`} style={{ width: `${conf}%` }} />
                  </div>
                  <span className={`text-xs font-mono font-semibold ${confIconColor}`}>{conf}%</span>
                  <span className="text-xs text-dark-700">confidence</span>
                </div>
              </div>

              <div className="px-5 py-5 text-sm text-dark-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                <ReactMarkdown components={mdComponents}>{data.answer}</ReactMarkdown>
              </div>

              {data.sources?.length > 0 && (
                <div className="px-5 pb-5 border-t border-dark-800/40 pt-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <FileText className="w-3.5 h-3.5 text-dark-700" />
                    <span className="text-[11px] font-semibold text-dark-600 uppercase tracking-widest">Sources</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {data.sources.map((s, i) => (
                      <span key={i} className="text-xs bg-dark-900/60 text-dark-500 px-2.5 py-1 rounded-lg border border-dark-800/50">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <p className="text-center text-[11px] text-dark-700">
              Powered by ResolveIT AI · RAG pipeline
            </p>
          </div>
        )}
      </main>
    </AppLayout>
  );
}
