import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Server, Wifi, Package, Settings, Clock, ChevronRight } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const CATEGORIES = [
  { label: 'Server',      prefix: '[Server] ',      icon: Server,  color: 'text-red-400',     ring: 'hover:border-red-500/30 hover:text-red-300',   active: 'border-red-500/30 text-red-300 bg-red-500/5' },
  { label: 'Network',     prefix: '[Network] ',     icon: Wifi,    color: 'text-sky-400',      ring: 'hover:border-sky-500/30 hover:text-sky-300',    active: 'border-sky-500/30 text-sky-300 bg-sky-500/5' },
  { label: 'Application', prefix: '[Application] ', icon: Package, color: 'text-emerald-400',  ring: 'hover:border-emerald-500/30 hover:text-emerald-300', active: 'border-emerald-500/30 text-emerald-300 bg-emerald-500/5' },
  { label: 'Other',       prefix: '[Other] ',       icon: Settings,color: 'text-primary-400',  ring: 'hover:border-primary-500/30 hover:text-primary-300', active: 'border-primary-500/30 text-primary-300 bg-primary-500/5' },
];

const TEMPLATES = {
  Server: [
    '502 Bad Gateway on Apache/Nginx — diagnose and fix',
    'High CPU usage on Linux server — investigation steps',
    'Disk space full alert — cleanup procedure',
    'Service not starting after system reboot',
  ],
  Network: [
    'DNS resolution failure — troubleshooting steps',
    'Network latency spikes — root cause analysis',
    'VPN connection dropping frequently — fix guide',
    'Firewall blocking legitimate traffic — diagnosis',
  ],
  Application: [
    'Application throwing OutOfMemoryError — fix steps',
    'Database connection pool exhausted — resolution',
    'API returning 500 errors in production — debug',
    'Slow application response times — performance fix',
  ],
  Other: [
    'SSL certificate expiry — renewal procedure',
    'Scheduled backup job failing — investigation',
    'Cron job not executing — troubleshooting',
    'Log rotation not working — fix steps',
  ],
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function CommandCenter({ onQuickAction }) {
  const { token, user } = useAuth();
  const [health, setHealth] = useState(null);
  const [recentQueries, setRecentQueries] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [backendOffline, setBackendOffline] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/health`)
      .then(r => { setHealth(r.data); setBackendOffline(false); })
      .catch(() => setBackendOffline(true));
    if (token) {
      axios.get(`${API_BASE}/history?per_page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => setRecentQueries(r.data?.logs || [])).catch(() => {});
    }
  }, [token]);

  const chunkCount = health?.faiss_metadata_entries ?? null;
  const avgConf = recentQueries.length
    ? Math.round(recentQueries.reduce((s, q) => s + (q.confidence_score || 0), 0) / recentQueries.length * 100)
    : null;

  const firstName = user?.name?.split(' ')[0] || 'there';

  const handleCategoryClick = (cat) => {
    setActiveCategory(activeCategory === cat.label ? null : cat.label);
  };

  const handleTemplateClick = (prefix, template) => {
    onQuickAction(prefix + template);
    setActiveCategory(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto animate-fade-in space-y-6">

      {/* Backend offline banner */}
      {backendOffline && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
          <span className="font-medium text-sm">Backend offline</span>
          <span className="text-xs text-amber-600/80">— start the FastAPI server on port 8000 to enable queries</span>
        </div>
      )}

      {/* Greeting + inline stats */}
      <div className="space-y-1">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-dark-100">
            {getGreeting()}, {firstName}.
          </h2>
          <span className="text-xs text-dark-600">{formatDate()}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-dark-600">
          {chunkCount !== null && (
            <>
              <span><span className="text-dark-400 font-medium">{chunkCount.toLocaleString()}</span> runbook chunks</span>
              <span className="text-dark-800">·</span>
            </>
          )}
          {recentQueries.length > 0 && (
            <>
              <span><span className="text-dark-400 font-medium">{recentQueries.length}</span> recent queries</span>
              <span className="text-dark-800">·</span>
            </>
          )}
          {avgConf !== null && (
            <span>
              <span className={`font-medium ${avgConf >= 70 ? 'text-emerald-400' : avgConf >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
                {avgConf}%
              </span>{' '}avg confidence
            </span>
          )}
        </div>
      </div>

      {/* Category pills */}
      <div className="space-y-3">
        <p className="text-[11px] font-semibold text-dark-600 uppercase tracking-widest">
          Quick Query by Category
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.label;
            return (
              <button
                key={cat.label}
                onClick={() => handleCategoryClick(cat)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                  isActive
                    ? cat.active
                    : `border-dark-800/60 text-dark-500 bg-dark-950/50 ${cat.ring}`
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? '' : cat.color}`} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Template panel — slides in below pills */}
        {activeCategory && (
          <div className="animate-slide-down space-y-1 pl-1">
            <p className="text-[10px] font-semibold text-dark-700 uppercase tracking-widest mb-2">
              {activeCategory} Templates
            </p>
            {TEMPLATES[activeCategory]?.map((tpl, i) => {
              const cat = CATEGORIES.find(c => c.label === activeCategory);
              return (
                <button
                  key={i}
                  onClick={() => handleTemplateClick(cat.prefix, tpl)}
                  className="template-item w-full flex items-center justify-between group"
                >
                  <span>{tpl}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-dark-700 group-hover:text-dark-500 flex-shrink-0 ml-2" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent activity */}
      {recentQueries.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-dark-600 uppercase tracking-widest flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Recent Activity
          </p>
          <div className="space-y-1">
            {recentQueries.map((q, i) => {
              const conf = Math.round((q.confidence_score || 0) * 100);
              const confColor = conf >= 70 ? 'text-emerald-400' : conf >= 40 ? 'text-amber-400' : 'text-red-400';
              return (
                <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-dark-900/50 transition-colors group cursor-default">
                  <p className="text-sm text-dark-400 truncate flex-1 group-hover:text-dark-300 transition-colors">
                    {q.query_text}
                  </p>
                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span className={`text-xs font-mono ${confColor}`}>{conf}%</span>
                    <span className="text-xs text-dark-700">{timeAgo(q.queried_at)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
