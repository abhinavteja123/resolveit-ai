import { useState } from 'react';
import Navbar from '../components/Navbar';
import QueryInput from '../components/QueryInput';
import ResultCard from '../components/ResultCard';
import { useQuery } from '../hooks/useQuery';
import { Cpu, BookOpen, Brain, Layers, AlertTriangle, Shield, Upload, Layers as LayersIcon } from 'lucide-react';
import toast from 'react-hot-toast';

const SCOPE_OPTIONS = [
  { value: 'admin', label: 'Admin Runbooks', description: 'Use only admin-indexed runbooks' },
  { value: 'mine', label: 'My Runbooks', description: 'Use only your uploaded runbooks' },
  { value: 'both', label: 'Admin + Mine', description: 'Combine admin and your runbooks' },
];

export default function Dashboard() {
  const { result, loading, error, submitQuery, submitFeedback } = useQuery();
  const [hasQueried, setHasQueried] = useState(false);
  const [scope, setScope] = useState('admin');

  const handleQuery = async (queryText) => {
    setHasQueried(true);
    try {
      await submitQuery(queryText, scope);
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 bg-mesh">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero section (visible before first query) */}
        {!hasQueried && !result && (
          <div className="text-center mb-12 animate-fade-in">
            <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-xl shadow-primary-500/20">
              <Cpu className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              What issue are you facing?
            </h1>
            <p className="text-dark-400 text-sm max-w-lg mx-auto">
              Describe your IT problem in natural language. Our RAG pipeline will search
              through indexed runbooks and generate actionable resolution steps.
            </p>
          </div>
        )}

        {/* Query input */}
        <div className={hasQueried ? 'mb-4' : 'mb-6'}>
          <QueryInput onSubmit={handleQuery} loading={loading} />
        </div>

        {/* Scope selector */}
        <div className="flex flex-wrap items-center gap-2 mb-8 justify-center">
          <span className="text-xs text-dark-500 mr-1">Search in:</span>
          {SCOPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setScope(opt.value)}
              title={opt.description}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                scope === opt.value
                  ? 'bg-primary-500/20 text-primary-400 border-primary-500/40'
                  : 'bg-dark-800/40 text-dark-500 border-dark-700/40 hover:text-dark-300 hover:border-dark-600/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="w-full max-w-3xl mx-auto animate-fade-in">
            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Brain className="w-5 h-5 text-primary-500 animate-pulse" />
                <span className="text-sm text-dark-400">Searching runbooks & generating resolution...</span>
              </div>
              <div className="space-y-3">
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-5/6" />
                <div className="skeleton h-4 w-4/6" />
                <div className="skeleton h-4 w-full" />
                <div className="skeleton h-4 w-3/4" />
              </div>
              <div className="flex gap-2 mt-4">
                <div className="skeleton h-8 w-24 rounded-full" />
                <div className="skeleton h-8 w-28 rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="w-full max-w-3xl mx-auto animate-slide-up">
            <div className="glass-card p-5 border-red-500/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-400">Query Failed</p>
                  <p className="text-xs text-dark-500 mt-0.5">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <ResultCard result={result} onFeedback={submitFeedback} />
        )}

        {/* Feature cards (visible before first query) */}
        {!hasQueried && !result && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mt-8 animate-slide-up">
            <div className="glass-card-hover p-5 text-center">
              <BookOpen className="w-6 h-6 text-primary-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-dark-200 mb-1">Multi-Format</h3>
              <p className="text-xs text-dark-500">PDF, DOCX & TXT runbooks indexed with section-aware chunking</p>
            </div>
            <div className="glass-card-hover p-5 text-center">
              <Brain className="w-6 h-6 text-purple-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-dark-200 mb-1">Smart Retrieval</h3>
              <p className="text-xs text-dark-500">FAISS vector search + cross-encoder re-ranking for precision</p>
            </div>
            <div className="glass-card-hover p-5 text-center">
              <Layers className="w-6 h-6 text-emerald-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-dark-200 mb-1">AI Resolution</h3>
              <p className="text-xs text-dark-500">Gemini LLM generates step-by-step fix with cited sources</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
