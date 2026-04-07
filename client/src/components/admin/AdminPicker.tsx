import { useDeferredValue, useMemo, useState } from "react";

export interface PickerOption {
  value: string;
  label: string;
  subtitle?: string;
  previewSrc?: string;
  meta?: string;
}

interface SearchablePickerFieldProps {
  label: string;
  value?: string;
  options: PickerOption[];
  placeholder?: string;
  onChange: (value: string | undefined) => void;
  onCreate?: () => void;
  createLabel?: string;
  clearLabel?: string;
  emptyLabel?: string;
}

export function SearchablePickerField({
  label,
  value,
  options,
  placeholder = "Filter options",
  onChange,
  onCreate,
  createLabel = "New",
  clearLabel = "Clear",
  emptyLabel = "No matching entries.",
}: SearchablePickerFieldProps): JSX.Element {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const current = options.find((option) => option.value === value) ?? null;

  const filtered = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    return options.filter((option) => {
      if (!normalized) {
        return true;
      }
      return [
        option.value,
        option.label,
        option.subtitle ?? "",
        option.meta ?? "",
      ].some((part) => part.toLowerCase().includes(normalized));
    });
  }, [deferredQuery, options]);

  return (
    <div className="admin-picker-field">
      <div className="admin-picker-header">
        <span className="admin-picker-label">{label}</span>
        <div className="admin-picker-actions">
          {value && (
            <button type="button" className="admin-picker-action" onClick={() => onChange(undefined)}>
              {clearLabel}
            </button>
          )}
          {onCreate && (
            <button type="button" className="admin-picker-action" onClick={onCreate}>
              {createLabel}
            </button>
          )}
        </div>
      </div>

      <div className="admin-picker-current">
        {current ? (
          <PickerOptionCard option={current} active compact />
        ) : (
          <span className="admin-picker-empty">No selection.</span>
        )}
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="admin-picker-search"
      />

      <div className="admin-picker-list" role="listbox" aria-label={label}>
        {filtered.length === 0 ? (
          <div className="admin-picker-empty-row">{emptyLabel}</div>
        ) : (
          filtered.slice(0, 12).map((option) => (
            <button
              key={option.value}
              type="button"
              className={`admin-picker-option${option.value === value ? " active" : ""}`}
              onClick={() => onChange(option.value)}
            >
              <PickerOptionCard option={option} active={option.value === value} />
            </button>
          ))
        )}
      </div>
    </div>
  );
}

interface TagMultiPickerFieldProps {
  label: string;
  values: string[];
  options: PickerOption[];
  placeholder?: string;
  onChange: (values: string[]) => void;
  onCreate?: () => void;
  createLabel?: string;
}

export function TagMultiPickerField({
  label,
  values,
  options,
  placeholder = "Filter items",
  onChange,
  onCreate,
  createLabel = "New",
}: TagMultiPickerFieldProps): JSX.Element {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const selected = useMemo(
    () => values.map((value) => options.find((option) => option.value === value)).filter(Boolean) as PickerOption[],
    [options, values]
  );

  const filtered = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    return options.filter((option) => {
      if (!normalized) {
        return true;
      }
      return [
        option.value,
        option.label,
        option.subtitle ?? "",
        option.meta ?? "",
      ].some((part) => part.toLowerCase().includes(normalized));
    });
  }, [deferredQuery, options]);

  function addValue(nextValue: string): void {
    if (values.includes(nextValue)) {
      return;
    }
    onChange([...values, nextValue]);
  }

  function removeValue(nextValue: string): void {
    onChange(values.filter((value) => value !== nextValue));
  }

  return (
    <div className="admin-picker-field">
      <div className="admin-picker-header">
        <span className="admin-picker-label">{label}</span>
        {onCreate && (
          <div className="admin-picker-actions">
            <button type="button" className="admin-picker-action" onClick={onCreate}>
              {createLabel}
            </button>
          </div>
        )}
      </div>

      <div className="admin-tag-list">
        {selected.length === 0 ? (
          <span className="admin-picker-empty">No linked items.</span>
        ) : (
          selected.map((option) => (
            <span key={option.value} className="admin-tag-chip">
              <span>{option.label}</span>
              <button type="button" className="admin-tag-remove" onClick={() => removeValue(option.value)} aria-label={`Remove ${option.label}`}>
                ✕
              </button>
            </span>
          ))
        )}
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={placeholder}
        className="admin-picker-search"
      />

      <div className="admin-picker-list" role="listbox" aria-label={label}>
        {filtered.length === 0 ? (
          <div className="admin-picker-empty-row">No matching entries.</div>
        ) : (
          filtered.slice(0, 12).map((option) => {
            const selectedOption = values.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                className={`admin-picker-option${selectedOption ? " active" : ""}`}
                disabled={selectedOption}
                onClick={() => addValue(option.value)}
              >
                <PickerOptionCard option={option} active={selectedOption} />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

function PickerOptionCard({ option, active, compact = false }: { option: PickerOption; active?: boolean; compact?: boolean }): JSX.Element {
  return (
    <div className={`admin-picker-option-card${compact ? " compact" : ""}${active ? " active" : ""}`}>
      {option.previewSrc ? (
        <img src={option.previewSrc} alt="" className="admin-picker-preview pixel-art-asset" />
      ) : (
        <div className="admin-picker-preview admin-picker-preview--text">{option.label.slice(0, 3).toUpperCase()}</div>
      )}
      <div className="admin-picker-copy">
        <span className="admin-picker-title">{option.label}</span>
        <span className="admin-picker-subtitle">{option.subtitle ?? option.value}</span>
        {option.meta && <span className="admin-picker-meta">{option.meta}</span>}
      </div>
    </div>
  );
}

