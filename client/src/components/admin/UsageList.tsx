interface UsageEntry {
  label: string;
  meta?: string;
  onClick?: () => void;
}

interface UsageListProps {
  title?: string;
  entries: UsageEntry[];
}

export function UsageList({ title = "Used By", entries }: UsageListProps): JSX.Element {
  return (
    <div className="admin-usage-list">
      <p className="admin-usage-title">{title}</p>
      {entries.length === 0 ? (
        <p className="admin-usage-empty">No inbound links.</p>
      ) : (
        <div className="admin-usage-entries">
          {entries.map((entry) => (
            entry.onClick ? (
              <button key={`${entry.label}-${entry.meta ?? ""}`} type="button" className="admin-usage-entry admin-usage-entry--button" onClick={entry.onClick}>
                <span>{entry.label}</span>
                {entry.meta && <span>{entry.meta}</span>}
              </button>
            ) : (
              <div key={`${entry.label}-${entry.meta ?? ""}`} className="admin-usage-entry">
                <span>{entry.label}</span>
                {entry.meta && <span>{entry.meta}</span>}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
