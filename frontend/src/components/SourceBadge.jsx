import { useState } from 'react';
import { FileText, X } from 'lucide-react';

const categoryClasses = {
  server:      'badge-server',
  network:     'badge-network',
  application: 'badge-application',
  other:       'badge-other',
};

export default function SourceBadge({ source }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const cls = categoryClasses[source.category] || categoryClasses.other;

  return (
    <>
      <div
        className="glass-card p-2.5 flex flex-col gap-1 hover:border-dark-700/80 transition-all duration-200 cursor-pointer"
        onClick={() => setPanelOpen(true)}
        title="View source excerpt"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cls}>{source.category}</span>
          <span className="text-xs font-medium text-dark-300 truncate">{source.filename}</span>
        </div>
        {source.section && source.section !== 'N/A' && (
          <p className="text-[11px] text-dark-600 truncate">§ {source.section}</p>
        )}
      </div>

      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-dark-950/70 backdrop-blur-sm" onClick={() => setPanelOpen(false)} />

          <div className="relative w-full max-w-md bg-dark-900 border-l border-dark-800/70 shadow-2xl flex flex-col animate-slide-right">
            <div className="flex items-center justify-between px-5 py-4 border-b border-dark-800/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-semibold text-dark-200">Source Details</span>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-lg text-dark-600 hover:text-dark-300 hover:bg-dark-800/60 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
              <Field label="File" value={<span className="text-sm font-medium text-dark-200 break-all">{source.filename}</span>} />
              {source.section && source.section !== 'N/A' && (
                <Field label="Section" value={<span className="text-sm text-dark-400">{source.section}</span>} />
              )}
              <Field label="Category" value={<span className={cls}>{source.category}</span>} />
              {source.citation != null && (
                <Field label="Citation" value={<span className="text-sm font-mono text-primary-400">[{source.citation}]</span>} />
              )}
              {source.excerpt && (
                <Field
                  label="Excerpt"
                  value={
                    <p className="text-sm text-dark-400 leading-relaxed bg-dark-950/50 rounded-xl p-3 border border-dark-800/50">
                      {source.excerpt}
                    </p>
                  }
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-dark-700 uppercase tracking-widest mb-1.5">{label}</p>
      {value}
    </div>
  );
}
