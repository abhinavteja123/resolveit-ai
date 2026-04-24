import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, TrendingUp, BookOpen, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function RunbookHealthGrid() {
  const { token } = useAuth();
  const [health, setHealth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    axios.get(`${API_BASE}/admin/runbook-health`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setHealth(r.data?.runbook_health || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading || !health.length) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-dark-600" />
        <h2 className="text-base font-semibold text-dark-200">Runbook Health</h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {health.map((rb) => {
          const ratioPct = rb.thumbs_up_ratio !== null ? Math.round(rb.thumbs_up_ratio * 100) : null;
          const avgPct = Math.round((rb.avg_confidence || 0) * 100);
          const barColor = ratioPct === null ? '' : ratioPct >= 70 ? 'bg-emerald-500' : ratioPct >= 40 ? 'bg-amber-500' : 'bg-red-500';
          const avgColor = avgPct >= 70 ? 'text-emerald-400' : avgPct >= 40 ? 'text-amber-400' : 'text-red-400';

          return (
            <div
              key={rb.id}
              className={`glass-card p-4 space-y-2.5 ${rb.needs_attention ? 'border-red-500/15' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <BookOpen className="w-3.5 h-3.5 text-dark-700 flex-shrink-0" />
                  <p className="text-sm font-medium text-dark-300 truncate">{rb.filename}</p>
                </div>
                {rb.needs_attention && (
                  <span className="badge bg-red-500/10 text-red-400 border border-red-500/20 flex-shrink-0 flex items-center gap-1 text-[10px]">
                    <AlertTriangle className="w-3 h-3" />
                    Attention
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-dark-600 flex-wrap">
                <span className="flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  {rb.query_count} {rb.query_count === 1 ? 'query' : 'queries'}
                </span>
                <span>Avg: <span className={avgColor}>{avgPct}%</span></span>
                {ratioPct !== null && <span className="text-dark-600">👍 {ratioPct}%</span>}
              </div>

              {ratioPct !== null && (
                <div className="w-full h-1 bg-dark-800/70 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor} transition-all duration-700`} style={{ width: `${ratioPct}%` }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
