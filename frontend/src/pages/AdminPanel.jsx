import { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import RunbookUploader from '../components/RunbookUploader';
import RunbookTable from '../components/RunbookTable';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  TrendingUp,
  FileText,
  AlertCircle,
  Calendar,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function AdminPanel() {
  const { token } = useAuth();
  const [runbooks, setRunbooks] = useState([]);
  const [runbooksLoading, setRunbooksLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchRunbooks = useCallback(async () => {
    setRunbooksLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/runbooks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRunbooks(res.data.runbooks || []);
    } catch (err) {
      console.error('Failed to fetch runbooks:', err);
    } finally {
      setRunbooksLoading(false);
    }
  }, [token]);

  const handleDelete = async (runbookId) => {
    await axios.delete(`${API_BASE}/admin/runbooks/${runbookId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await fetchRunbooks();
  };

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/admin/feedback-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRunbooks();
    fetchStats();
  }, [fetchRunbooks, fetchStats]);

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-dark-500">Manage runbooks & monitor feedback</p>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<MessageSquare className="w-5 h-5" />}
            iconColor="text-primary-400"
            iconBg="bg-primary-500/10"
            label="Total Queries"
            value={statsLoading ? '—' : stats?.total_queries ?? 0}
          />
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            iconColor="text-blue-400"
            iconBg="bg-blue-500/10"
            label="Indexed Runbooks"
            value={runbooksLoading ? '—' : runbooks.length}
          />
          <StatCard
            icon={<ThumbsUp className="w-5 h-5" />}
            iconColor="text-emerald-400"
            iconBg="bg-emerald-500/10"
            label="Thumbs Up Rate"
            value={statsLoading ? '—' : `${stats?.thumbs_up_rate ?? 0}%`}
          />
          <StatCard
            icon={<ThumbsDown className="w-5 h-5" />}
            iconColor="text-red-400"
            iconBg="bg-red-500/10"
            label="Thumbs Down Rate"
            value={statsLoading ? '—' : `${stats?.thumbs_down_rate ?? 0}%`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload (left) */}
          <div className="lg:col-span-1">
            <RunbookUploader onUploadComplete={fetchRunbooks} uploadUrl={`${API_BASE}/admin/upload`} />
          </div>

          {/* Runbooks table (right) */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-dark-500" />
                Indexed Runbooks
              </h2>
              <RunbookTable runbooks={runbooks} loading={runbooksLoading} onDelete={handleDelete} />
            </div>

            {/* Negative feedback */}
            {stats?.recent_negative?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  Recent Negative Feedback
                </h2>
                <div className="space-y-2">
                  {stats.recent_negative.map((item, i) => (
                    <div
                      key={i}
                      className="glass-card p-4 border-red-500/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-dark-200 font-medium truncate">
                            "{item.query_text}"
                          </p>
                          {item.comment && (
                            <p className="text-xs text-dark-500 mt-1">
                              Comment: {item.comment}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-dark-600 text-xs flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          {item.submitted_at
                            ? new Date(item.submitted_at).toLocaleDateString()
                            : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, iconColor, iconBg, label, value }) {
  return (
    <div className="glass-card-hover p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-xs text-dark-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
