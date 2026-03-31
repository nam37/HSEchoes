import React, { useState } from "react";
import type { QuestDef, QuestObjectiveType, QuestTriggerType } from "../../../../shared/src/index";

interface Props {
  initial: QuestDef;
  onSave: (quest: QuestDef) => Promise<void>;
  onClose: () => void;
}

const OBJECTIVE_TYPES: QuestObjectiveType[] = ["reach_room", "defeat_enemy", "collect_item", "interact_terminal"];
const TRIGGER_TYPES: QuestTriggerType[] = ["on_start", "on_room_entry", "on_item_collect", "on_enemy_defeat"];

function blankObjective(index: number): QuestDef["objectives"][number] {
  return { id: `obj_${Date.now()}_${index}`, description: "", type: "reach_room", targetId: "" };
}

export function QuestEditor({ initial, onSave, onClose }: Props): JSX.Element {
  const [quest, setQuest] = useState<QuestDef>({
    ...initial,
    objectives: initial.objectives.map((o) => ({ ...o })),
    trigger: { ...initial.trigger }
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function setField<K extends keyof QuestDef>(key: K, val: QuestDef[K]): void {
    setQuest((prev) => ({ ...prev, [key]: val }));
  }

  function setTriggerType(type: QuestTriggerType): void {
    setQuest((prev) => ({ ...prev, trigger: { type, targetId: type === "on_start" ? undefined : (prev.trigger.targetId ?? "") } }));
  }

  function setTriggerTarget(targetId: string): void {
    setQuest((prev) => ({ ...prev, trigger: { ...prev.trigger, targetId } }));
  }

  function addObjective(): void {
    setQuest((prev) => ({ ...prev, objectives: [...prev.objectives, blankObjective(prev.objectives.length)] }));
  }

  function removeObjective(index: number): void {
    setQuest((prev) => ({ ...prev, objectives: prev.objectives.filter((_, i) => i !== index) }));
  }

  function setObjectiveField(index: number, key: keyof QuestDef["objectives"][number], val: string): void {
    setQuest((prev) => {
      const next = prev.objectives.map((o, i) => i === index ? { ...o, [key]: val } : o);
      return { ...prev, objectives: next };
    });
  }

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (!quest.id.trim()) { setErr("ID is required."); return; }
    if (!quest.title.trim()) { setErr("Title is required."); return; }
    if (quest.objectives.length === 0) { setErr("At least one objective is required."); return; }
    for (const obj of quest.objectives) {
      if (!obj.description.trim()) { setErr("All objectives need a description."); return; }
    }
    setBusy(true);
    try {
      await onSave(quest);
      onClose();
    } catch (caught) {
      setErr((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const triggerNeedsTarget = quest.trigger.type !== "on_start";

  return (
    <form className="admin-form" onSubmit={(e) => void submit(e)}>
      {err && <p className="error-banner">{err}</p>}

      <div className="admin-form-grid">
        <label>ID
          <input value={quest.id} onChange={(e) => setField("id", e.target.value)} disabled={!!initial.id} />
        </label>
        <label>Title
          <input value={quest.title} onChange={(e) => setField("title", e.target.value)} />
        </label>
        <label>XP Reward
          <input type="number" min={0} value={quest.xpReward} onChange={(e) => setField("xpReward", Number(e.target.value))} />
        </label>
        <label>Credit Reward
          <input type="number" min={0} value={quest.creditReward} onChange={(e) => setField("creditReward", Number(e.target.value))} />
        </label>
        <label className="span-2">Description
          <textarea value={quest.description} onChange={(e) => setField("description", e.target.value)} />
        </label>

        <label>Trigger
          <select value={quest.trigger.type} onChange={(e) => setTriggerType(e.target.value as QuestTriggerType)}>
            {TRIGGER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        {triggerNeedsTarget && (
          <label>Trigger Target ID
            <input
              value={quest.trigger.targetId ?? ""}
              onChange={(e) => setTriggerTarget(e.target.value)}
              placeholder="roomId / itemId / encounterId"
            />
          </label>
        )}
      </div>

      <div className="admin-section-header" style={{ marginTop: "1.25rem" }}>
        <h4 style={{ margin: 0, fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)" }}>
          Objectives ({quest.objectives.length})
        </h4>
        <button type="button" className="btn-primary" onClick={addObjective}>+ Add Objective</button>
      </div>

      {quest.objectives.map((obj, i) => (
        <div key={obj.id} className="admin-form-grid quest-objective-row" style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid var(--line-dim, #333)" }}>
          <label>Objective ID
            <input value={obj.id} onChange={(e) => setObjectiveField(i, "id", e.target.value)} />
          </label>
          <label>Type
            <select value={obj.type} onChange={(e) => setObjectiveField(i, "type", e.target.value)}>
              {OBJECTIVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label>Target ID
            <input value={obj.targetId ?? ""} onChange={(e) => setObjectiveField(i, "targetId", e.target.value)} placeholder="roomId / encounterId / itemId" />
          </label>
          <label style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" className="btn-danger" onClick={() => removeObjective(i)}>Remove</button>
          </label>
          <label className="span-2">Description
            <input value={obj.description} onChange={(e) => setObjectiveField(i, "description", e.target.value)} />
          </label>
        </div>
      ))}

      <div className="admin-modal-footer">
        <button type="button" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn-primary" disabled={busy}>Save Quest</button>
      </div>
    </form>
  );
}
