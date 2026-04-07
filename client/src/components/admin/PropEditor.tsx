import React, { useState } from "react";
import type { AssetDef, PropDef } from "../../../../shared/src/index";
import { AssetPickerField } from "./AssetPickerField";
import { UsageList } from "./UsageList";

interface Props {
  initial: PropDef;
  assets: AssetDef[];
  usage?: Array<{ label: string; meta?: string; onClick?: () => void }>;
  onSave: (prop: PropDef) => Promise<unknown>;
  onClose: () => void;
}

export function PropEditor({ initial, assets, usage = [], onSave, onClose }: Props): JSX.Element {
  const [prop, setProp] = useState<PropDef>({ ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof PropDef>(key: K, value: PropDef[K]): void {
    setProp((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!prop.id.trim()) {
      setErr("ID is required.");
      return;
    }
    setBusy(true);
    try {
      await onSave(prop);
      onClose();
    } catch (caught) {
      setErr((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(event) => void submit(event)}>
      {err && <p className="error-banner">{err}</p>}
      <div className="admin-form-grid">
        <label>ID<input value={prop.id} onChange={(event) => setField("id", event.target.value)} disabled={!!initial.id} /></label>
        <label>Name<input value={prop.name} onChange={(event) => setField("name", event.target.value)} /></label>
        <label>Render Hint
          <select value={prop.renderHint ?? "billboard"} onChange={(event) => setField("renderHint", event.target.value as PropDef["renderHint"])}>
            <option value="billboard">billboard</option>
            <option value="mesh">mesh</option>
            <option value="none">none</option>
          </select>
        </label>
        <label>Icon Label<input value={prop.iconLabel ?? ""} onChange={(event) => setField("iconLabel", event.target.value || undefined)} maxLength={4} /></label>
        <div className="span-2">
          <AssetPickerField
            label="Prop Asset"
            value={prop.assetId}
            assets={assets}
            types={["icon", "portrait", "sprite"]}
            onChange={(value) => setField("assetId", value)}
          />
        </div>
        <label className="span-2">Description<textarea value={prop.description ?? ""} onChange={(event) => setField("description", event.target.value || undefined)} /></label>
      </div>
      <UsageList title={`Linked Rooms (${usage.length})`} entries={usage} />
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Prop</button>
      </div>
    </form>
  );
}
