import React, { useMemo, useState } from "react";
import type { AssetDef, DialogueLine, NPC } from "../../../../shared/src/index";
import { AssetPickerField } from "./AssetPickerField";
import { UsageList } from "./UsageList";

interface Props {
  initial: NPC;
  assets: AssetDef[];
  usage?: Array<{ label: string; meta?: string; onClick?: () => void }>;
  onSave: (npc: NPC) => Promise<unknown>;
  onClose: () => void;
}

export function NpcEditor({ initial, assets, usage = [], onSave, onClose }: Props): JSX.Element {
  const [npc, setNpc] = useState<NPC>({ ...initial });
  const [dialogueText, setDialogueText] = useState(() => linesToText(initial.dialogue));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const dialoguePreview = useMemo(() => textToLines(npc.id || "npc", dialogueText), [dialogueText, npc.id]);

  function setField<K extends keyof NPC>(key: K, value: NPC[K]): void {
    setNpc((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!npc.id.trim()) {
      setErr("ID is required.");
      return;
    }
    setBusy(true);
    try {
      await onSave({ ...npc, dialogue: textToLines(npc.id, dialogueText) });
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
        <label>ID<input value={npc.id} onChange={(event) => setField("id", event.target.value)} disabled={!!initial.id} /></label>
        <label>Name<input value={npc.name} onChange={(event) => setField("name", event.target.value)} /></label>
        <label className="span-2">Role<input value={npc.role} onChange={(event) => setField("role", event.target.value)} /></label>
        <div className="span-2">
          <AssetPickerField
            label="Portrait Asset"
            value={npc.portraitAssetId}
            assets={assets}
            types={["portrait"]}
            onChange={(value) => setField("portraitAssetId", value)}
          />
        </div>
        <label className="span-2">
          Dialogue Lines
          <textarea
            rows={8}
            value={dialogueText}
            onChange={(event) => setDialogueText(event.target.value)}
            placeholder="One line per paragraph"
          />
        </label>
      </div>
      <UsageList title={`Linked Rooms (${usage.length})`} entries={usage} />
      <p className="admin-hint">Preview: {dialoguePreview.length} dialogue lines will be saved in linear order.</p>
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save NPC</button>
      </div>
    </form>
  );
}

function linesToText(lines: DialogueLine[]): string {
  return lines.map((line) => line.text).join("\n\n");
}

function textToLines(prefix: string, text: string): DialogueLine[] {
  const chunks = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return chunks.map((chunk, index) => ({
    id: `${prefix || "npc"}_${String(index + 1).padStart(2, "0")}`,
    text: chunk,
    nextId: index < chunks.length - 1 ? `${prefix || "npc"}_${String(index + 2).padStart(2, "0")}` : undefined,
  }));
}
