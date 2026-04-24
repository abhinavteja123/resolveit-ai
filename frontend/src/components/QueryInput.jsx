import { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { Search, Loader2, ArrowRight } from 'lucide-react';

const QueryInput = forwardRef(function QueryInput({ onSubmit, loading }, ref) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setQueryText: (text) => setQuery(text),
    focus: () => inputRef.current?.focus(),
  }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && !loading) {
      onSubmit(query.trim());
      setQuery('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto">
      <div
        className={`relative flex items-center bg-dark-900 border rounded-2xl overflow-hidden transition-all duration-300 ${
          loading
            ? 'border-primary-600/40 shadow-md shadow-primary-600/10'
            : 'border-dark-800/70 hover:border-dark-700/80 focus-within:border-primary-600/50 focus-within:shadow-md focus-within:shadow-primary-600/10'
        }`}
      >
        {/* Icon */}
        <div className="flex items-center pl-5 text-dark-600">
          {loading ? (
            <Loader2 className="w-4.5 h-4.5 w-[18px] h-[18px] animate-spin text-primary-500" />
          ) : (
            <Search className="w-[18px] h-[18px]" />
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe your IT issue — e.g. 'Apache 502 gateway error'"
          className="flex-1 bg-transparent border-none px-4 py-4 text-dark-200 placeholder:text-dark-700 focus:outline-none text-[15px] leading-snug"
          disabled={loading}
        />

        {/* Submit button */}
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="flex items-center gap-1.5 mr-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold
                     transition-all duration-200
                     hover:bg-primary-500 hover:shadow-md hover:shadow-primary-600/25
                     active:scale-[0.97]
                     disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none"
        >
          {loading ? (
            <>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 rounded-full bg-white animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </>
          ) : (
            <>
              Resolve
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </div>

      <p className="text-center text-dark-700 text-[11px] mt-2.5 tracking-wide">
        RAG pipeline · FAISS + Cross-Encoder + Gemini
      </p>
    </form>
  );
});

export default QueryInput;
