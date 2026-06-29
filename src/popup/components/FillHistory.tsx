import React, { useState, useEffect } from "react";
import { FillHistoryEntry, getFillHistory, clearFillHistory, deleteFillHistoryEntry } from "../../storage/historyStorage";
import { t } from "../../i18n";

export default function FillHistory() {
  const [entries, setEntries] = useState<FillHistoryEntry[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const history = await getFillHistory();
    setEntries(history);
  }

  async function handleClear() {
    if (!confirm("Clear all fill history?")) return;
    await clearFillHistory();
    setEntries([]);
  }

  async function handleDelete(id: string) {
    await deleteFillHistoryEntry(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function formatTime(ts: number): string {
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - ts;

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return "Yesterday";
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const filtered = filter
    ? entries.filter((e) =>
        e.domain.toLowerCase().includes(filter.toLowerCase()) ||
        e.profileName.toLowerCase().includes(filter.toLowerCase())
      )
    : entries;

  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t("fillHistory") || "Fill History"}</h3>
        {entries.length > 0 && (
          <button
            onClick={handleClear}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              background: "#fee2e2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {entries.length > 5 && (
        <input
          type="text"
          placeholder="Filter by domain or profile..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 10px",
            marginBottom: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 6,
            fontSize: 12,
            boxSizing: "border-box",
          }}
        />
      )}

      {filtered.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 20 }}>
          {entries.length === 0 ? "No fill history yet. Fill a form to see history here." : "No results matching filter."}
        </p>
      ) : (
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {filtered.map((entry) => (
            <div
              key={entry.id}
              style={{
                padding: "8px 10px",
                marginBottom: 6,
                background: "#f9fafb",
                borderRadius: 8,
                border: "1px solid #f3f4f6",
                fontSize: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, color: "#1f2937" }}>
                  {entry.domain}
                </span>
                <span style={{ color: "#9ca3af", fontSize: 11 }}>
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 3 }}>
                <span style={{ color: "#6b7280" }}>
                  {entry.filledCount}/{entry.totalFields} fields • {entry.profileName}
                </span>
                <button
                  onClick={() => handleDelete(entry.id)}
                  style={{
                    padding: "1px 6px",
                    fontSize: 10,
                    background: "transparent",
                    color: "#9ca3af",
                    border: "none",
                    cursor: "pointer",
                  }}
                  title="Remove"
                >
                  ×
                </button>
              </div>
              {entry.fieldsSummary.length > 0 && (
                <div style={{ marginTop: 3, color: "#9ca3af", fontSize: 10 }}>
                  {entry.fieldsSummary.slice(0, 5).join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
