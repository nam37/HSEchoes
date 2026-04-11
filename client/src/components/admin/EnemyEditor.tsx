import React, { useState } from "react";
import type { AssetDef, Enemy } from "../../../../shared/src/index";
import { AssetPickerField } from "./AssetPickerField";
import { UsageList } from "./UsageList";

interface Props {
  initial: Enemy;
  assets: AssetDef[];
  usage?: Array<{ label: string; meta?: string; onClick?: () => void }>;
  onSave: (e: Enemy) => Promise<unknown>;
  onClose: () => void;
}

export function EnemyEditor({ initial, assets, usage = [], onSave, onClose }: Props): JSX.Element {
  const [enemy, setEnemy] = useState<Enemy>({ ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof Enemy>(key: K, val: Enemy[K]): void {
    setEnemy((prev) => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!enemy.id.trim()) { setErr("ID is required."); return; }
    setBusy(true);
    try {
      await onSave(enemy);
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
        <label>ID<input value={enemy.id} onChange={(e) => setField("id", e.target.value)} disabled={!!initial.id} /></label>
        <label>Name<input value={enemy.name} onChange={(e) => setField("name", e.target.value)} /></label>
        <label>Max HP<input type="number" value={enemy.maxHp} onChange={(e) => setField("maxHp", Number(e.target.value))} /></label>
        <label>Attack<input type="number" value={enemy.attack} onChange={(e) => setField("attack", Number(e.target.value))} /></label>
        <label>Defense<input type="number" value={enemy.defense} onChange={(e) => setField("defense", Number(e.target.value))} /></label>
        <div className="span-2">
          <AssetPickerField
            label="Sprite Asset"
            value={enemy.spritePath}
            assets={assets}
            types={["sprite", "portrait", "icon"]}
            onChange={(value) => setField("spritePath", value ?? "")}
          />
        </div>
        <div className="span-2">
          <AssetPickerField
            label="Model Asset"
            value={enemy.modelAssetId}
            assets={assets}
            types={["mesh"]}
            onChange={(value) => setField("modelAssetId", value)}
          />
        </div>
        <label className="span-2">Intro Line<textarea value={enemy.introLine} onChange={(e) => setField("introLine", e.target.value)} /></label>
      </div>
      <UsageList title={`Used In (${usage.length})`} entries={usage} />
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Enemy</button>
      </div>
    </form>
  );
}
