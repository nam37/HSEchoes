import React, { useState } from "react";
import type { Terminal } from "../../../../shared/src/index";
import { UsageList } from "./UsageList";

interface Props {
  initial: Terminal;
  usage?: Array<{ label: string; meta?: string; onClick?: () => void }>;
  onSave: (terminal: Terminal) => Promise<unknown>;
  onClose: () => void;
}

export function TerminalEditor({ initial, usage = [], onSave, onClose }: Props): JSX.Element {
  const [terminal, setTerminal] = useState<Terminal>({ ...initial });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof Terminal>(key: K, value: Terminal[K]): void {
    setTerminal((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    if (!terminal.id.trim()) {
      setErr("ID is required.");
      return;
    }
    setBusy(true);
    try {
      await onSave(terminal);
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
        <label>ID<input value={terminal.id} onChange={(event) => setField("id", event.target.value)} disabled={!!initial.id} /></label>
        <label>XP Reward<input type="number" value={terminal.xpReward ?? ""} onChange={(event) => setField("xpReward", event.target.value ? Number(event.target.value) : undefined)} /></label>
        <label className="span-2">Title<input value={terminal.title} onChange={(event) => setField("title", event.target.value)} /></label>
        <label className="span-2">
          Log Text
          <textarea rows={12} value={terminal.logText} onChange={(event) => setField("logText", event.target.value)} />
        </label>
      </div>
      <UsageList title={`Linked Rooms (${usage.length})`} entries={usage} />
      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Terminal</button>
      </div>
    </form>
  );
}
