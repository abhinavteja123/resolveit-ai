import { useState } from 'react';
import { Search, Loader2, Sparkles } from 'lucide-react';

export default function QueryInput({ onSubmit, loading }) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSubmit(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div className="relative group">
        {/* Glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-500 to-purple-500 rounded-2xl opacity-0 group-focus-within:opacity-20 blur transition-opacity duration-500" />

        <div className="relative flex items-center bg-dark-900/80 border border-dark-600/50 rounded-2xl overflow-hidden group-focus-within:border-primary-500/40 transition-all duration-300">
          <div className="flex items-center pl-5 text-dark-500">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
            ) : (
              <Search className="w-5 h-5" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe your IT issue... e.g. 'Apache server returning 502 errors'"
            className="flex-1 bg-transparent border-none px-4 py-4 text-dark-100 placeholder:text-dark-500 focus:outline-none text-[15px]"
            disabled={loading}
          />

          <button
            type="submit"
            disabled={!query.trim() || loading}
            className="flex items-center gap-2 mr-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold
                       transition-all duration-300 hover:from-primary-500 hover:to-primary-400
                       hover:shadow-lg hover:shadow-primary-500/25 active:scale-[0.97]
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Resolving...' : 'Resolve'}
          </button>
        </div>
      </div>

      <p className="text-center text-dark-600 text-xs mt-3">
        Powered by RAG pipeline • FAISS + Cross-Encoder + Gemini
      </p>
    </form>
  );
}
