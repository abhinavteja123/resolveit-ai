import { useState } from 'react';
import { FileText, Calendar, Hash, Trash2, Loader2 } from 'lucide-react';

const categoryClasses = {
  server:      'badge-server',
  network:     'badge-network',
  application: 'badge-application',
  other:       'badge-other',
};

export default function RunbookTable({ runbooks, loading, onDelete }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (rb) => {
    if (!window.confirm(`Delete "${rb.filename}"? This cannot be undone.`)) return;
    setDeletingId(rb.id);
    try { await onDelete(rb.id); }
    finally { setDeletingId(null); }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
      </div>
    );
  }

  if (!runbooks || runbooks.length === 0) {
    return (
      <div className="glass-card p-10 text-center">
        <FileText className="w-10 h-10 text-dark-700 mx-auto mb-3" />
        <p className="text-dark-500 font-medium">No runbooks indexed yet</p>
        <p className="text-dark-700 text-sm mt-1">Upload your first runbook above</p>
      </div>
    );
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-800/60">
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-dark-600 uppercase tracking-widest">Filename</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-dark-600 uppercase tracking-widest">Category</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-dark-600 uppercase tracking-widest">Chunks</th>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-dark-600 uppercase tracking-widest">Uploaded</th>
              {onDelete && <th className="px-5 py-3 w-10" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/40">
            {runbooks.map((rb) => (
              <tr key={rb.id} className="hover:bg-dark-900/40 transition-colors duration-150">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-3.5 h-3.5 text-dark-700 flex-shrink-0" />
                    <span className="text-dark-300 font-medium text-sm">{rb.filename}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className={categoryClasses[rb.category] || categoryClasses.other}>{rb.category}</span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-dark-500 text-xs">
                    <Hash className="w-3 h-3" />
                    {rb.chunk_count || 0}
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5 text-dark-600 text-xs">
                    <Calendar className="w-3 h-3" />
                    {rb.uploaded_at ? new Date(rb.uploaded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                  </div>
                </td>
                {onDelete && (
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleDelete(rb)}
                      disabled={deletingId === rb.id}
                      className="p-1.5 rounded-lg text-dark-700 hover:text-red-400 hover:bg-red-500/10 transition-all duration-150 disabled:opacity-40"
                      title="Delete"
                    >
                      {deletingId === rb.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
