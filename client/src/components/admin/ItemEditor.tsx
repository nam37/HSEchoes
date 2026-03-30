import React, { useState } from "react";
import type { Item, ItemSlot } from "../../../../shared/src/index";

const ITEM_SLOTS: ItemSlot[] = ["weapon", "armor", "accessory", "consumable"];

interface Props {
  initial: Item;
  onSave: (item: Item) => Promise<void>;
  onClose: () => void;
}

export function ItemEditor({ initial, onSave, onClose }: Props): JSX.Element {
  const [item, setItem] = useState<Item>({ ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof Item>(key: K, val: Item[K]): void {
    setItem((prev) => ({ ...prev, [key]: val }));
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!item.id.trim()) { setErr("ID is required."); return; }
    setBusy(true);
    try {
      await onSave(item);
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
        <label>ID<input value={item.id} onChange={(e) => setField("id", e.target.value)} disabled={!!initial.id} /></label>
        <label>Name<input value={item.name} onChange={(e) => setField("name", e.target.value)} /></label>
        <label>Slot
          <select value={item.slot} onChange={(e) => setField("slot", e.target.value as ItemSlot)}>
            {ITEM_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>Icon Path<input value={item.iconPath} onChange={(e) => setField("iconPath", e.target.value)} /></label>
        <label>Attack Bonus<input type="number" value={item.attackBonus ?? ""} onChange={(e) => setField("attackBonus", e.target.value ? Number(e.target.value) : undefined)} /></label>
        <label>Defense Bonus<input type="number" value={item.defenseBonus ?? ""} onChange={(e) => setField("defenseBonus", e.target.value ? Number(e.target.value) : undefined)} /></label>
        <label>Heal Amount<input type="number" value={item.healAmount ?? ""} onChange={(e) => setField("healAmount", e.target.value ? Number(e.target.value) : undefined)} /></label>
        <label>Key Item<input type="checkbox" checked={!!item.keyItem} onChange={(e) => setField("keyItem", e.target.checked || undefined)} /></label>
        <label className="span-2">Description<textarea value={item.description} onChange={(e) => setField("description", e.target.value)} /></label>
      </div>
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Item</button>
      </div>
    </form>
  );
}
