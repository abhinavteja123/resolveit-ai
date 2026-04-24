import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedbackButtons({ queryLogId, onSubmit }) {
  const [submitted, setSubmitted] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFeedback = async (rating) => {
    if (submitted || !queryLogId) return;
    setLoading(true);
    try {
      await onSubmit(queryLogId, rating);
      setSubmitted(rating);
      toast.success(rating === 1 ? 'Glad it helped!' : 'Thanks — we\'ll improve');
    } catch {
      toast.error('Feedback failed');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs text-dark-600">
          {submitted === 1 ? 'Marked as helpful' : 'Feedback noted — thanks'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs text-dark-700">Was this helpful?</span>
      <button
        onClick={() => handleFeedback(1)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                   text-dark-500 hover:text-emerald-400 hover:bg-emerald-500/10
                   border border-dark-800/60 hover:border-emerald-500/30
                   transition-all duration-200 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsUp className="w-3 h-3" />}
        Yes
      </button>
      <button
        onClick={() => handleFeedback(-1)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                   text-dark-500 hover:text-red-400 hover:bg-red-500/10
                   border border-dark-800/60 hover:border-red-500/30
                   transition-all duration-200 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ThumbsDown className="w-3 h-3" />}
        No
      </button>
    </div>
  );
}
