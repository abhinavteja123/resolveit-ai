import ReactMarkdown from 'react-markdown';
import SourceBadge from './SourceBadge';
import FeedbackButtons from './FeedbackButtons';
import { FileText, TrendingUp, Zap } from 'lucide-react';

export default function ResultCard({ result, onFeedback }) {
  if (!result) return null;

  const { answer, sources, top_confidence, query_log_id } = result;

  // Deduplicate sources by filename — keep first occurrence (highest rerank score)
  const uniqueSources = sources
    ? Object.values(
        sources.reduce((acc, s) => {
          if (!acc[s.filename]) acc[s.filename] = s;
          return acc;
        }, {})
      )
    : [];

  // Confidence indicator
  const confidencePercent = Math.round(top_confidence * 100);
  const confidenceClass =
    top_confidence >= 0.7
      ? 'confidence-high'
      : top_confidence >= 0.4
      ? 'confidence-medium'
      : 'confidence-low';
  const confidenceLabel =
    top_confidence >= 0.7
      ? 'High Confidence'
      : top_confidence >= 0.4
      ? 'Medium Confidence'
      : 'Low Confidence';

  return (
    <div className="w-full max-w-3xl mx-auto animate-slide-up">
      <div className="glass-card overflow-hidden">
        {/* Confidence bar */}
        <div className="px-6 pt-5 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-sm font-semibold text-dark-200">Resolution</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-dark-500" />
              <span className="text-xs text-dark-500">{confidenceLabel}</span>
            </div>
            <div className="w-24 h-2 bg-dark-700/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${confidenceClass} transition-all duration-1000`}
                style={{ width: `${confidencePercent}%` }}
              />
            </div>
            <span className="text-xs font-mono text-dark-500">{confidencePercent}%</span>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 border-t border-dark-700/30" />

        {/* Answer content */}
        <div className="px-6 py-5">
          <div className="prose prose-invert prose-sm max-w-none text-dark-200 leading-relaxed">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
                ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
                li: ({ children }) => <li className="text-dark-200">{children}</li>,
                strong: ({ children }) => <strong className="text-dark-100 font-semibold">{children}</strong>,
                code: ({ children }) => <code className="bg-dark-700 px-1.5 py-0.5 rounded text-xs font-mono text-primary-300">{children}</code>,
              }}
            >
              {answer}
            </ReactMarkdown>
          </div>
        </div>

        {/* Sources */}
        {uniqueSources.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-3.5 h-3.5 text-dark-500" />
              <span className="text-xs font-semibold text-dark-500 uppercase tracking-wider">
                Sources ({uniqueSources.length})
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {uniqueSources.map((source, i) => (
                <SourceBadge key={i} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="mx-6 border-t border-dark-700/30" />

        {/* Feedback */}
        <div className="px-6 py-4">
          <FeedbackButtons queryLogId={query_log_id} onSubmit={onFeedback} />
        </div>
      </div>
    </div>
  );
}
