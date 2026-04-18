import { useState } from 'react';
import { FileText, Calendar, Hash, Trash2, Loader2 } from 'lucide-react';

export default function RunbookTable({ runbooks, loading, onDelete }) {
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (rb) => {
    if (!window.confirm(`Delete "${rb.filename}"? This cannot be undone.`)) return;
    setDeletingId(rb.id);
    try {
      await onDelete(rb.id);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!runbooks || runbooks.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <FileText className="w-12 h-12 text-dark-600 mx-auto mb-3" />
        <p className="text-dark-400">No runbooks indexed yet</p>
        <p className="text-dark-600 text-sm mt-1">Upload your first runbook above</p>
      </div>
    );
  }

  const categoryClasses = {
    server: 'badge-server',
    network: 'badge-network',
    application: 'badge-application',
    other: 'badge-other',
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700/50">
              <th className="text-left px-5 py-4 text-dark-500 font-semibold text-xs uppercase tracking-wider">
                Filename
              </th>
              <th className="text-left px-5 py-4 text-dark-500 font-semibold text-xs uppercase tracking-wider">
                Category
              </th>
              <th className="text-left px-5 py-4 text-dark-500 font-semibold text-xs uppercase tracking-wider">
                Chunks
              </th>
              <th className="text-left px-5 py-4 text-dark-500 font-semibold text-xs uppercase tracking-wider">
                Uploaded
              </th>
              {onDelete && (
                <th className="px-5 py-4 text-dark-500 font-semibold text-xs uppercase tracking-wider w-12" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700/30">
            {runbooks.map((rb) => (
              <tr
                key={rb.id}
                className="hover:bg-dark-800/30 transition-colors duration-200"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-dark-500 flex-shrink-0" />
                    <span className="text-dark-200 font-medium">{rb.filename}</span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={categoryClasses[rb.category] || categoryClasses.other}>
                    {rb.category}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-dark-400">
                    <Hash className="w-3.5 h-3.5" />
                    {rb.chunk_count || 0}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1.5 text-dark-500 text-xs">
                    <Calendar className="w-3.5 h-3.5" />
                    {rb.uploaded_at
                      ? new Date(rb.uploaded_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </div>
                </td>
                {onDelete && (
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleDelete(rb)}
                      disabled={deletingId === rb.id}
                      title="Delete runbook"
                      className="p-1.5 rounded-lg text-dark-600 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 disabled:opacity-40"
                    >
                      {deletingId === rb.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
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
