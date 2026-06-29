import React, { useState, useEffect } from "react";
import { AutoFillRule } from "../../models/autoFillRule";
import { getRules, saveRules } from "../../storage/rulesStorage";
import { generateId } from "../../utils/ids";

export default function AutoFillRules() {
  const [rules, setRules] = useState<AutoFillRule[]>([]);
  const [newKeywords, setNewKeywords] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newCategory, setNewCategory] = useState("");

  useEffect(() => {
    getRules().then(setRules);
  }, []);

  const handleAdd = async () => {
    const keywords = newKeywords.split(",").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0 || !newValue.trim()) return;

    const rule: AutoFillRule = {
      id: generateId(),
      keywords,
      value: newValue.trim(),
      enabled: true,
      category: newCategory.trim() || undefined,
    };

    const updated = [...rules, rule];
    setRules(updated);
    await saveRules(updated);
    setNewKeywords("");
    setNewValue("");
    setNewCategory("");
  };

  const handleDelete = async (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    await saveRules(updated);
  };

  const handleToggle = async (id: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    setRules(updated);
    await saveRules(updated);
  };

  const handleValueEdit = async (id: string, value: string) => {
    const updated = rules.map((r) =>
      r.id === id ? { ...r, value } : r
    );
    setRules(updated);
    await saveRules(updated);
  };

  const categories = Array.from(new Set(rules.map((r) => r.category).filter(Boolean)));

  return (
    <div className="autofill-rules">
      <div className="rules-header">
        <h3 style={{ margin: "0 0 4px", fontSize: 13 }}>Custom Auto-Fill Rules</h3>
        <p style={{ margin: 0, fontSize: 11, color: "#888" }}>
          Define keyword→value pairs for fields the engine can&apos;t match automatically.
        </p>
      </div>

      <div className="rule-add-form">
        <input
          type="text"
          placeholder="Keywords (comma-separated): salary, compensation"
          value={newKeywords}
          onChange={(e) => setNewKeywords(e.target.value)}
          className="rule-input"
        />
        <input
          type="text"
          placeholder="Value: $120,000"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="rule-input"
        />
        <div className="rule-add-row">
          <input
            type="text"
            placeholder="Category (optional)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rule-input rule-category-input"
          />
          <button className="rule-add-btn" onClick={handleAdd} disabled={!newKeywords.trim() || !newValue.trim()}>
            + Add Rule
          </button>
        </div>
      </div>

      {rules.length === 0 ? (
        <div className="rules-empty">
          <p>No rules yet. Examples:</p>
          <ul style={{ fontSize: 11, margin: "4px 0", paddingLeft: 18, color: "#888" }}>
            <li><b>salary, compensation</b> → $120,000</li>
            <li><b>notice period</b> → 2 weeks</li>
            <li><b>availability, start date</b> → Immediately</li>
            <li><b>relocation</b> → Yes</li>
            <li><b>work mode, remote</b> → Hybrid</li>
          </ul>
        </div>
      ) : (
        <div className="rules-list">
          {categories.length > 0 && categories.map((cat) => (
            <div key={cat} className="rules-category">
              <div className="rules-category-header">{cat}</div>
              {rules.filter((r) => r.category === cat).map((rule) => (
                <RuleRow key={rule.id} rule={rule} onToggle={handleToggle} onDelete={handleDelete} onValueEdit={handleValueEdit} />
              ))}
            </div>
          ))}
          {rules.filter((r) => !r.category).map((rule) => (
            <RuleRow key={rule.id} rule={rule} onToggle={handleToggle} onDelete={handleDelete} onValueEdit={handleValueEdit} />
          ))}
        </div>
      )}

      <div style={{ fontSize: 10, color: "#999", marginTop: 8, textAlign: "center" }}>
        {rules.length} rule{rules.length !== 1 ? "s" : ""} · {rules.filter((r) => r.enabled).length} active
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  onToggle,
  onDelete,
  onValueEdit,
}: {
  rule: AutoFillRule;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onValueEdit: (id: string, value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(rule.value);

  return (
    <div className={`rule-row ${rule.enabled ? "" : "rule-disabled"}`}>
      <input
        type="checkbox"
        checked={rule.enabled}
        onChange={() => onToggle(rule.id)}
        title={rule.enabled ? "Disable rule" : "Enable rule"}
      />
      <div className="rule-keywords">
        {rule.keywords.map((kw, i) => (
          <span key={i} className="rule-keyword-tag">{kw}</span>
        ))}
      </div>
      <span className="rule-arrow">→</span>
      {editing ? (
        <input
          type="text"
          className="rule-input rule-value-edit"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => { onValueEdit(rule.id, editValue); setEditing(false); }}
          onKeyDown={(e) => { if (e.key === "Enter") { onValueEdit(rule.id, editValue); setEditing(false); } }}
          autoFocus
        />
      ) : (
        <span className="rule-value" onClick={() => setEditing(true)} title="Click to edit">
          {rule.value}
        </span>
      )}
      <button className="rule-delete-btn" onClick={() => onDelete(rule.id)} title="Delete rule">×</button>
    </div>
  );
}
