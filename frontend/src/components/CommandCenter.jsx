import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Wifi, Package, Settings, Clock, ChevronRight, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const CATEGORIES = [
  { label: 'Server',      prefix: '[Server] ',      icon: Server,  color: 'text-red-400',     bg: 'bg-red-500/10' },
  { label: 'Network',     prefix: '[Network] ',     icon: Wifi,    color: 'text-sky-400',      bg: 'bg-sky-500/10' },
  { label: 'Application', prefix: '[Application] ', icon: Package, color: 'text-emerald-400',  bg: 'bg-emerald-500/10' },
  { label: 'Other',       prefix: '[Other] ',       icon: Settings,color: 'text-primary-400',  bg: 'bg-primary-500/10' },
];

const TEMPLATES = {
  Server: [
    '502 Bad Gateway on Apache/Nginx — diagnose and fix',
    'High CPU usage on Linux server — investigation steps',
    'Disk space full alert — cleanup procedure',
  ],
  Network: [
    'DNS resolution failure — troubleshooting steps',
    'Network latency spikes — root cause analysis',
    'VPN connection dropping frequently — fix guide',
  ],
  Application: [
    'Database connection pool exhausted — resolution',
    'API returning 500 errors in production — debug',
    'Slow application response times — performance fix',
  ],
  Other: [
    'SSL certificate expiry — renewal procedure',
    'Scheduled backup job failing — investigation',
    'Cron job not executing — troubleshooting',
  ],
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
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

// Framer Motion Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

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
      axios.get(`${API_BASE}/history?per_page=3`, { // Fetched 3 for the bento layout
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => setRecentQueries(r.data?.logs || [])).catch(() => {});
    }
  }, [token]);

  const chunkCount = health?.faiss_metadata_entries ?? 0;
  const avgConf = recentQueries.length
    ? Math.round(recentQueries.reduce((s, q) => s + (q.confidence_score || 0), 0) / recentQueries.length * 100)
    : 0;

  const firstName = user?.name?.split(' ')[0] || 'there';

  const handleTemplateClick = (prefix, template) => {
    onQuickAction(prefix + template);
    setActiveCategory(null);
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-4xl mx-auto space-y-4"
    >
      {/* Backend offline banner */}
      {backendOffline && (
        <motion.div variants={itemVariants} className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-lg shadow-amber-500/5">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 animate-pulse" />
          <span className="font-semibold text-sm">Backend offline</span>
          <span className="text-xs text-amber-500/80">— start the FastAPI server on port 8000</span>
        </motion.div>
      )}

      {/* Bento Grid Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Welcome Card - Spans 2 columns */}
        <motion.div 
          variants={itemVariants}
          className="md:col-span-2 glass-card p-6 flex flex-col justify-between group overflow-hidden relative h-full"
        >
          {/* Subtle background glow */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-primary-600/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-primary-600/20 transition-colors duration-700" />
          
          <div>
            <h2 className="text-2xl font-bold text-dark-50 tracking-tight mb-1">
              {getGreeting()}, <span className="text-primary-400">{firstName}</span>.
            </h2>
            <p className="text-dark-400 text-sm font-medium">What issue are we resolving today?</p>
          </div>
          
          <div className="mt-8 flex items-center gap-6">
            <div>
              <p className="text-3xl font-black text-dark-100 font-mono tracking-tighter">{chunkCount.toLocaleString()}</p>
              <p className="text-[10px] uppercase tracking-widest text-dark-500 font-bold mt-1">Runbook Chunks</p>
            </div>
            <div className="w-px h-10 bg-dark-800" />
            <div>
              <p className="text-3xl font-black text-dark-100 font-mono tracking-tighter flex items-center gap-1">
                {avgConf}%
                {avgConf > 0 && <Activity className="w-4 h-4 text-emerald-500" />}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-dark-500 font-bold mt-1">Avg AI Confidence</p>
            </div>
          </div>
        </motion.div>

        {/* Categories - 2x2 Grid inside 1 column */}
        <motion.div variants={itemVariants} className="glass-card p-4 flex flex-col h-full">
          <div className="mb-2">
             <p className="text-[10px] uppercase tracking-widest text-dark-500 font-bold ml-1">Quick Select</p>
          </div>
          <div className="grid grid-cols-2 gap-2 flex-1">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.label;
            return (
              <motion.button
                key={cat.label}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveCategory(isActive ? null : cat.label)}
                className={cn(
                  "flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-300 gap-2",
                  isActive ? "bg-dark-800 border-primary-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]" : "bg-dark-950/40 border-dark-800/60 hover:bg-dark-900/80 hover:border-dark-700"
                )}
              >
                <div className={cn("p-2 rounded-lg", cat.bg)}>
                  <Icon className={cn("w-5 h-5", cat.color)} />
                </div>
                <span className="text-[11px] font-semibold text-dark-300">{cat.label}</span>
              </motion.button>
            );
          })}
          </div>
        </motion.div>

        {/* Dynamic Templates Reveal */}
        <AnimatePresence mode="popLayout">
          {activeCategory && (
            <motion.div 
              initial={{ opacity: 0, height: 0, scale: 0.9 }}
              animate={{ opacity: 1, height: 'auto', scale: 1 }}
              exit={{ opacity: 0, height: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="col-span-1 md:col-span-3 glass-card p-4 overflow-hidden border-primary-500/30"
            >
              <div className="flex items-center gap-2 mb-3 ml-1">
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                <p className="text-[11px] font-bold text-dark-200 uppercase tracking-widest">
                  {activeCategory} Scenarios
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {TEMPLATES[activeCategory]?.map((tpl, i) => {
                  const cat = CATEGORIES.find(c => c.label === activeCategory);
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleTemplateClick(cat.prefix, tpl)}
                      className="text-left p-3 rounded-xl bg-dark-950/50 border border-dark-800 hover:border-primary-500/40 hover:bg-dark-900/80 transition-colors group flex items-start justify-between"
                    >
                      <span className="text-xs text-dark-300 font-medium leading-relaxed group-hover:text-dark-100 transition-colors">{tpl}</span>
                      <ChevronRight className="w-4 h-4 text-dark-600 group-hover:text-primary-400 mt-0.5 ml-2 flex-shrink-0 transition-colors" />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
}
