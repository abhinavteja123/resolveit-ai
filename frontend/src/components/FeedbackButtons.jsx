import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeedbackButtons({ queryLogId, onSubmit }) {
  const [submitted, setSubmitted] = useState(null); // 1 or -1
  const [loading, setLoading] = useState(false);

  const handleFeedback = async (rating) => {
    if (submitted || !queryLogId) return;
    setLoading(true);
    try {
      await onSubmit(queryLogId, rating);
      setSubmitted(rating);
      toast.success(rating === 1 ? 'Thanks for the feedback! 👍' : 'Thanks — we\'ll improve! 🔧');
    } catch (err) {
      toast.error('Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Check className="w-4 h-4 text-emerald-400" />
        <span className="text-dark-500">
          {submitted === 1 ? 'Helpful — thanks!' : 'Noted — we\'ll improve'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-dark-600">Was this helpful?</span>
      <button
        onClick={() => handleFeedback(1)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                   text-dark-400 hover:text-emerald-400 hover:bg-emerald-500/10
                   border border-dark-700/50 hover:border-emerald-500/30
                   transition-all duration-300 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsUp className="w-3.5 h-3.5" />}
        Yes
      </button>
      <button
        onClick={() => handleFeedback(-1)}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                   text-dark-400 hover:text-red-400 hover:bg-red-500/10
                   border border-dark-700/50 hover:border-red-500/30
                   transition-all duration-300 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ThumbsDown className="w-3.5 h-3.5" />}
        No
      </button>
    </div>
  );
}
