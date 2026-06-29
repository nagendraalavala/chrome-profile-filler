import React, { useState } from "react";
import { Profile, FlattenedField } from "../../models/profile";
import { flattenFields } from "../../utils/flatten";
import { t } from "../../i18n";

interface Props {
  profile: Profile;
}

type CopyFormat = "text" | "json" | "csv";

export default function ClipboardCopy({ profile }: Props) {
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<CopyFormat>("text");

  function formatProfile(fmt: CopyFormat): string {
    const fields: FlattenedField[] = flattenFields(profile.fields);
    const nonEmpty = fields.filter((f) => f.value && !f.isAttachment);

    switch (fmt) {
      case "text":
        return nonEmpty.map((f) => `${f.label}: ${f.value}`).join("\n");
      case "json":
        return JSON.stringify(
          Object.fromEntries(nonEmpty.map((f) => [f.dotKey, f.value])),
          null,
          2
        );
      case "csv":
        return "Field,Value\n" + nonEmpty.map((f) => `"${f.label}","${f.value}"`).join("\n");
      default:
        return "";
    }
  }

  async function handleCopy() {
    const text = formatProfile(format);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: select+copy from textarea
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleCopyField(field: FlattenedField) {
    navigator.clipboard.writeText(field.value).catch(() => {
      const ta = document.createElement("textarea");
      ta.value = field.value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    });
  }

  const fields = flattenFields(profile.fields).filter((f) => f.value && !f.isAttachment);

  return (
    <div style={{ padding: "12px 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{t("clipboard") || "Quick Copy"}</h3>
        <div style={{ display: "flex", gap: 4 }}>
          {(["text", "json", "csv"] as CopyFormat[]).map((fmt) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              style={{
                padding: "3px 8px",
                fontSize: 11,
                background: format === fmt ? "#4361ee" : "#f3f4f6",
                color: format === fmt ? "white" : "#6b7280",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleCopy}
        style={{
          width: "100%",
          padding: "8px",
          marginBottom: 12,
          background: copied ? "#10b981" : "#4361ee",
          color: "white",
          border: "none",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 13,
          transition: "background 0.2s",
        }}
      >
        {copied ? "Copied!" : `Copy All (${format.toUpperCase()})`}
      </button>

      <div style={{ maxHeight: 220, overflowY: "auto" }}>
        {fields.map((f) => (
          <div
            key={f.dotKey}
            onClick={() => handleCopyField(f)}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "5px 8px",
              marginBottom: 3,
              background: "#f9fafb",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 11,
              transition: "background 0.15s",
            }}
            title="Click to copy this field"
          >
            <span style={{ color: "#6b7280", fontWeight: 500 }}>{f.label}</span>
            <span style={{ color: "#1f2937", maxWidth: "55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
