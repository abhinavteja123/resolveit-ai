export default function SourceBadge({ source }) {
  const categoryClasses = {
    server: 'badge-server',
    network: 'badge-network',
    application: 'badge-application',
    other: 'badge-other',
  };

  const cls = categoryClasses[source.category] || categoryClasses.other;

  return (
    <div className="glass-card p-3 flex flex-col gap-1.5 hover:border-dark-600/70 transition-all duration-300">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cls}>{source.category}</span>
        <span className="text-sm font-medium text-dark-200">{source.filename}</span>
      </div>
      {source.section && source.section !== 'N/A' && (
        <p className="text-xs text-dark-500 pl-0.5">§ {source.section}</p>
      )}
    </div>
  );
}
