import React, { useState } from "react";
import type { Encounter, Enemy, Item } from "../../../../shared/src/index";

interface Props {
  initial: Encounter;
  enemies: Enemy[];
  items: Item[];
  onSave: (enc: Encounter) => Promise<void>;
  onClose: () => void;
}

export function EncounterEditor({ initial, enemies, items, onSave, onClose }: Props): JSX.Element {
  const [enc, setEnc] = useState<Encounter>({ ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof Encounter>(key: K, val: Encounter[K]): void {
    setEnc((prev) => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!enc.id.trim()) { setErr("ID is required."); return; }
    setBusy(true);
    try {
      await onSave(enc);
      onClose();
    } catch (caught) {
      setErr((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="admin-form" onSubmit={(e) => void submit(e)}>
      {err && <p className="error-banner">{err}</p>}
      <div className="admin-form-grid">
        <label>ID<input value={enc.id} onChange={(e) => setField("id", e.target.value)} disabled={!!initial.id} /></label>
        <label>Enemy
          <select value={enc.enemyId} onChange={(e) => setField("enemyId", e.target.value)}>
            <option value="">— select —</option>
            {enemies.map((en) => <option key={en.id} value={en.id}>{en.name}</option>)}
          </select>
        </label>
        <label>Can Flee<input type="checkbox" checked={enc.canFlee} onChange={(e) => setField("canFlee", e.target.checked)} /></label>
        <label>Once<input type="checkbox" checked={enc.once} onChange={(e) => setField("once", e.target.checked)} /></label>
        <label className="span-2">Intro<textarea value={enc.intro} onChange={(e) => setField("intro", e.target.value)} /></label>
        <label className="span-2">Victory Text<textarea value={enc.victoryText} onChange={(e) => setField("victoryText", e.target.value)} /></label>
        <label className="span-2">Defeat Text<textarea value={enc.defeatText} onChange={(e) => setField("defeatText", e.target.value)} /></label>
        <label className="span-2">Reward Items
          <div className="admin-checkbox-group">
            {items.map((it) => (
              <label key={it.id} className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={enc.rewardItemIds.includes(it.id)}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...enc.rewardItemIds, it.id]
                      : enc.rewardItemIds.filter((id) => id !== it.id);
                    setField("rewardItemIds", next);
                  }}
                />
                {it.name}
              </label>
            ))}
          </div>
        </label>
      </div>
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Encounter</button>
      </div>
    </form>
  );
}
