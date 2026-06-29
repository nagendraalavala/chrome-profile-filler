import React, { useState, useEffect } from "react";
import { ExpiryField } from "../../models/autoFillRule";
import { getExpiryFields, saveExpiryFields, getExpiringFields } from "../../storage/rulesStorage";
import { Profile, ProfileField } from "../../models/profile";

interface ExpiryTrackerProps {
  profiles: Profile[];
  activeProfileId: string | null;
}

const EXPIRY_FIELD_HINTS = [
  "passport", "visa", "license", "driver", "insurance", "work authorization",
  "permit", "certificate", "registration", "membership", "subscription",
  "id card", "green card", "ead", "i-94", "i-797",
];

function findExpiryEligibleFields(profile: Profile): { fieldId: string; label: string; groupLabel?: string }[] {
  const results: { fieldId: string; label: string; groupLabel?: string }[] = [];

  function walk(fields: ProfileField[], groupLabel?: string): void {
    for (const field of fields) {
      if (field.type === "GROUP" && field.children) {
        walk(field.children, field.label);
        continue;
      }
      const labelLower = (field.label || "").toLowerCase();
      const keyLower = (field.key || "").toLowerCase();
      const combined = labelLower + " " + keyLower;
      if (EXPIRY_FIELD_HINTS.some((hint) => combined.includes(hint))) {
        results.push({ fieldId: field.id, label: field.label, groupLabel });
      }
    }
  }
  walk(profile.fields);
  return results;
}

function daysUntil(dateStr: string): number {
  const expiry = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.ceil((expiry - now) / (24 * 60 * 60 * 1000));
}

function expiryBadge(dateStr: string): { text: string; className: string } {
  const days = daysUntil(dateStr);
  if (days < 0) return { text: `Expired ${Math.abs(days)}d ago`, className: "expiry-expired" };
  if (days === 0) return { text: "Expires today!", className: "expiry-expired" };
  if (days <= 30) return { text: `${days}d left`, className: "expiry-warning" };
  if (days <= 90) return { text: `${days}d left`, className: "expiry-soon" };
  return { text: `${days}d left`, className: "expiry-ok" };
}

export default function ExpiryTracker({ profiles, activeProfileId }: ExpiryTrackerProps) {
  const [expiryFields, setExpiryFields] = useState<ExpiryField[]>([]);
  const [addFieldId, setAddFieldId] = useState("");
  const [addDate, setAddDate] = useState("");

  const activeProfile = profiles.find((p) => p.profileId === activeProfileId);

  useEffect(() => {
    getExpiryFields().then(setExpiryFields);
  }, []);

  const eligibleFields = activeProfile ? findExpiryEligibleFields(activeProfile) : [];
  const trackedIds = new Set(expiryFields.map((f) => f.fieldId));
  const untrackedFields = eligibleFields.filter((f) => !trackedIds.has(f.fieldId));

  const handleAdd = async () => {
    if (!addFieldId || !addDate || !activeProfile) return;

    const eligible = eligibleFields.find((f) => f.fieldId === addFieldId);
    if (!eligible) return;

    const newField: ExpiryField = {
      fieldId: addFieldId,
      label: eligible.groupLabel ? `${eligible.groupLabel} > ${eligible.label}` : eligible.label,
      expiryDate: addDate,
      profileId: activeProfile.profileId,
      profileName: activeProfile.name,
    };

    const updated = [...expiryFields, newField];
    setExpiryFields(updated);
    await saveExpiryFields(updated);
    setAddFieldId("");
    setAddDate("");
  };

  const handleDelete = async (fieldId: string) => {
    const updated = expiryFields.filter((f) => f.fieldId !== fieldId);
    setExpiryFields(updated);
    await saveExpiryFields(updated);
  };

  const handleDateChange = async (fieldId: string, newDate: string) => {
    const updated = expiryFields.map((f) =>
      f.fieldId === fieldId ? { ...f, expiryDate: newDate } : f
    );
    setExpiryFields(updated);
    await saveExpiryFields(updated);
  };

  const expiring = getExpiringFields(expiryFields, 90);
  const sortedFields = [...expiryFields].sort((a, b) =>
    new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  );

  return (
    <div className="expiry-tracker">
      <div className="rules-header">
        <h3 style={{ margin: "0 0 4px", fontSize: 13 }}>Expiry Tracker</h3>
        <p style={{ margin: 0, fontSize: 11, color: "#888" }}>
          Track expiration dates for passport, visa, license, and other documents.
        </p>
      </div>

      {expiring.length > 0 && (
        <div className="expiry-alerts">
          {expiring.map((f) => {
            const badge = expiryBadge(f.expiryDate);
            return (
              <div key={f.fieldId} className={`expiry-alert ${badge.className}`}>
                <span className="expiry-alert-label">{f.label}</span>
                <span className="expiry-alert-badge">{badge.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {untrackedFields.length > 0 && (
        <div className="expiry-add-form">
          <select
            className="rule-input"
            value={addFieldId}
            onChange={(e) => setAddFieldId(e.target.value)}
          >
            <option value="">Select a field to track...</option>
            {untrackedFields.map((f) => (
              <option key={f.fieldId} value={f.fieldId}>
                {f.groupLabel ? `${f.groupLabel} > ${f.label}` : f.label}
              </option>
            ))}
          </select>
          <div className="rule-add-row">
            <input
              type="date"
              className="rule-input"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
            />
            <button
              className="rule-add-btn"
              onClick={handleAdd}
              disabled={!addFieldId || !addDate}
            >
              + Track
            </button>
          </div>
        </div>
      )}

      {sortedFields.length === 0 ? (
        <div className="rules-empty">
          <p>No tracked expiry dates yet.</p>
          <p style={{ fontSize: 11, color: "#888" }}>
            Add fields like Passport, Visa, License to get expiry reminders.
          </p>
        </div>
      ) : (
        <div className="rules-list">
          {sortedFields.map((f) => {
            const badge = expiryBadge(f.expiryDate);
            return (
              <div key={f.fieldId} className="rule-row">
                <div className="rule-keywords" style={{ flex: 1 }}>
                  <span style={{ fontSize: 12 }}>{f.label}</span>
                  <span style={{ fontSize: 10, color: "#999", marginLeft: 4 }}>({f.profileName})</span>
                </div>
                <input
                  type="date"
                  className="rule-input rule-value-edit"
                  value={f.expiryDate}
                  onChange={(e) => handleDateChange(f.fieldId, e.target.value)}
                  style={{ width: 120, fontSize: 11 }}
                />
                <span className={`expiry-badge-inline ${badge.className}`}>{badge.text}</span>
                <button className="rule-delete-btn" onClick={() => handleDelete(f.fieldId)} title="Stop tracking">×</button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: 10, color: "#999", marginTop: 8, textAlign: "center" }}>
        {expiryFields.length} tracked · {expiring.length} expiring soon
      </div>
    </div>
  );
}


