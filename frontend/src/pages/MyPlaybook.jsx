import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Bookmark, Trash2, BookOpen, ChevronDown, ChevronUp, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function MyPlaybook() {
  const { token } = useAuth();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/bookmarks`, { headers: { Authorization: `Bearer ${token}` } });
      setBookmarks(res.data?.bookmarks || []);
    } catch { toast.error('Failed to load playbook'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchBookmarks(); }, [fetchBookmarks]);

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BASE}/bookmarks/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setBookmarks(prev => prev.filter(b => b.id !== id));
      toast.success('Removed from Playbook');
    } catch { toast.error('Delete failed'); }
  };

  const handleCopyLink = (queryLogId) => {
    if (!queryLogId) return;
    navigator.clipboard.writeText(`${window.location.origin}/answer/${queryLogId}`)
      .then(() => toast.success('Link copied'))
      .catch(() => toast.error('Copy failed'));
  };

  return (
    <AppLayout>
      <main className="max-w-4xl mx-auto px-4 py-8">

        <div className="flex items-center gap-3 mb-8">
          <div className="page-header-icon bg-primary-600/15 border border-primary-600/20">
            <Bookmark className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">My Playbook</h1>
            <p className="text-sm text-dark-600">Saved resolutions for quick reference</p>
          </div>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-14 w-full rounded-xl" />)}
          </div>
        )}

        {!loading && bookmarks.length === 0 && (
          <div className="glass-card p-14 text-center animate-fade-in">
            <Bookmark className="w-10 h-10 text-dark-700 mx-auto mb-3" />
            <p className="text-dark-500 font-medium">No saved answers yet</p>
            <p className="text-sm text-dark-700 mt-1">Click the bookmark icon on any answer to save it here</p>
          </div>
        )}

        {!loading && bookmarks.length > 0 && (
          <div className="space-y-2 animate-slide-up">
            {bookmarks.map((bm) => {
              const isExpanded = expanded === bm.id;
              return (
                <div key={bm.id} className="glass-card overflow-hidden hover:border-dark-700/70 transition-colors">
                  <div
                    className="px-5 py-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-dark-900/40 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : bm.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark-300 truncate">
                        {bm.query_text || 'Untitled query'}
                      </p>
                      <p className="text-[11px] text-dark-700 mt-0.5">
                        {bm.bookmarked_at ? new Date(bm.bookmarked_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleCopyLink(bm.query_log_id); }}
                        className="p-1.5 rounded-lg text-dark-700 hover:text-primary-400 hover:bg-primary-600/10 transition-all"
                        title="Copy link"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(bm.id); }}
                        className="p-1.5 rounded-lg text-dark-700 hover:text-red-400 hover:bg-red-500/10 transition-all"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-dark-700 ml-0.5" />
                        : <ChevronDown className="w-3.5 h-3.5 text-dark-700 ml-0.5" />
                      }
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-dark-800/50 pt-3 space-y-2 animate-slide-down">
                      <p className="text-sm text-dark-400 leading-relaxed">{bm.answer_snippet}</p>
                      {bm.sources?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <BookOpen className="w-3.5 h-3.5 text-dark-700" />
                          {bm.sources.map((s, i) => (
                            <span key={i} className="text-[11px] text-dark-600 bg-dark-900/60 px-2 py-0.5 rounded-md border border-dark-800/50">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </AppLayout>
  );
}
