import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../components/AppLayout';
import RunbookUploader from '../components/RunbookUploader';
import RunbookTable from '../components/RunbookTable';
import RunbookHealthGrid from '../components/RunbookHealthGrid';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Shield, ThumbsUp, ThumbsDown, MessageSquare,
  FileText, AlertCircle, Calendar, ChevronDown, ChevronUp,
  Clipboard, Lightbulb, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function AdminPanel() {
  const { token } = useAuth();
  const [runbooks, setRunbooks] = useState([]);
  const [runbooksLoading, setRunbooksLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [gaps, setGaps] = useState([]);
  const [gapsLoading, setGapsLoading] = useState(true);
  const [gapsOpen, setGapsOpen] = useState(false);

  const fetchRunbooks = useCallback(async () => {
    setRunbooksLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/runbooks`, { headers: { Authorization: `Bearer ${token}` } });
      setRunbooks(res.data.runbooks || []);
    } catch {}
    finally { setRunbooksLoading(false); }
  }, [token]);

  const handleDelete = async (runbookId) => {
    await axios.delete(`${API_BASE}/admin/runbooks/${runbookId}`, { headers: { Authorization: `Bearer ${token}` } });
    await fetchRunbooks();
  };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/feedback-stats`, { headers: { Authorization: `Bearer ${token}` } });
      setStats(res.data);
    } catch {}
    finally { setStatsLoading(false); }
  }, [token]);

  const fetchGaps = useCallback(async () => {
    setGapsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/knowledge-gaps`, { headers: { Authorization: `Bearer ${token}` } });
      setGaps(res.data?.knowledge_gaps || []);
    } catch {}
    finally { setGapsLoading(false); }
  }, [token]);

  useEffect(() => { fetchRunbooks(); fetchStats(); fetchGaps(); }, [fetchRunbooks, fetchStats, fetchGaps]);

  const handleCopyGapQuery = (queryText) => {
    navigator.clipboard.writeText(queryText)
      .then(() => toast.success('Query copied as runbook title'))
      .catch(() => toast.error('Copy failed'));
  };

  return (
    <AppLayout>
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="page-header-icon bg-primary-600/15 border border-primary-600/20">
            <Shield className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-dark-100">Admin Dashboard</h1>
            <p className="text-sm text-dark-600">Manage runbooks · monitor performance</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <StatCard icon={<MessageSquare className="w-4 h-4" />} iconColor="text-primary-400" bg="bg-primary-600/10"
            label="Total Queries" value={statsLoading ? '—' : stats?.total_queries ?? 0} />
          <StatCard icon={<FileText className="w-4 h-4" />} iconColor="text-sky-400" bg="bg-sky-500/10"
            label="Indexed Runbooks" value={runbooksLoading ? '—' : runbooks.length} />
          <StatCard icon={<ThumbsUp className="w-4 h-4" />} iconColor="text-emerald-400" bg="bg-emerald-500/10"
            label="Thumbs Up Rate" value={statsLoading ? '—' : `${stats?.thumbs_up_rate ?? 0}%`} />
          <StatCard icon={<ThumbsDown className="w-4 h-4" />} iconColor="text-red-400" bg="bg-red-500/10"
            label="Thumbs Down Rate" value={statsLoading ? '—' : `${stats?.thumbs_down_rate ?? 0}%`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload panel */}
          <div className="lg:col-span-1">
            <RunbookUploader onUploadComplete={fetchRunbooks} uploadUrl={`${API_BASE}/admin/upload`} />
          </div>

          {/* Right content */}
          <div className="lg:col-span-2 space-y-6">

            {/* Indexed runbooks */}
            <section>
              <SectionHeader icon={<FileText className="w-4 h-4 text-dark-600" />} title="Indexed Runbooks" />
              <RunbookTable runbooks={runbooks} loading={runbooksLoading} onDelete={handleDelete} />
            </section>

            {/* Negative feedback */}
            {stats?.recent_negative?.length > 0 && (
              <section>
                <SectionHeader icon={<AlertCircle className="w-4 h-4 text-red-400" />} title="Recent Negative Feedback" />
                <div className="space-y-2">
                  {stats.recent_negative.map((item, i) => (
                    <div key={i} className="glass-card p-4 border-red-500/10">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dark-300 font-medium truncate">"{item.query_text}"</p>
                          {item.comment && <p className="text-xs text-dark-600 mt-0.5">"{item.comment}"</p>}
                        </div>
                        <div className="flex items-center gap-1.5 text-dark-700 text-xs flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Runbook health */}
            <RunbookHealthGrid />

            {/* Knowledge gaps */}
            {!gapsLoading && gaps.length > 0 && (
              <section>
                <button
                  onClick={() => setGapsOpen(o => !o)}
                  className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-primary-400" />
                    <span className="text-base font-semibold text-dark-200">Knowledge Gaps</span>
                    <span className="text-[11px] text-dark-600 bg-dark-800/60 px-2 py-0.5 rounded-full border border-dark-700/50">
                      {gaps.length}
                    </span>
                  </div>
                  {gapsOpen ? <ChevronUp className="w-4 h-4 text-dark-600" /> : <ChevronDown className="w-4 h-4 text-dark-600" />}
                </button>

                {gapsOpen && (
                  <div className="space-y-2 animate-slide-down">
                    <p className="text-xs text-dark-600 mb-3">
                      Queries with low confidence or negative feedback — consider uploading runbooks for these topics.
                    </p>
                    {gaps.map((gap, i) => {
                      const confPct = Math.round((gap.avg_confidence || 0) * 100);
                      const confColor = confPct >= 70 ? 'text-emerald-400' : confPct >= 40 ? 'text-amber-400' : 'text-red-400';
                      return (
                        <div key={i} className="glass-card p-4 flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-dark-300 truncate">"{gap.query_text}"</p>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-dark-600">
                              <span>{gap.count}× asked</span>
                              <span>Avg confidence: <span className={confColor}>{confPct}%</span></span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleCopyGapQuery(gap.query_text)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-dark-500 hover:text-dark-200 bg-dark-800/60 hover:bg-dark-700/60 border border-dark-700/50 transition-all flex-shrink-0"
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                            Copy
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </main>
    </AppLayout>
  );
}

function StatCard({ icon, iconColor, bg, label, value }) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center ${iconColor} flex-shrink-0`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-dark-100 leading-tight">{value}</p>
          <p className="text-[11px] text-dark-600 truncate">{label}</p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h2 className="text-base font-semibold text-dark-200">{title}</h2>
    </div>
  );
}
