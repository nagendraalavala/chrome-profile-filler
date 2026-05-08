import React, { useState } from "react";
import { Profile } from "../../models/profile";
import { importProfileFromJson, exportProfileToJson } from "../../utils/import-export";

interface ImportExportProps {
  profile: Profile;
  onImport: (profile: Profile) => void;
  onStatusMessage: (msg: string, type: "success" | "error") => void;
}

export default function ImportExport({
  profile,
  onImport,
  onStatusMessage,
}: ImportExportProps) {
  const [jsonText, setJsonText] = useState("");

  const handleExport = () => {
    const json = exportProfileToJson(profile);
    setJsonText(json);
    onStatusMessage("Profile exported to JSON", "success");
  };

  const handleImport = () => {
    if (!jsonText.trim()) {
      onStatusMessage("Paste JSON to import", "error");
      return;
    }
    try {
      const imported = importProfileFromJson(jsonText);
      onImport(imported);
      onStatusMessage(`Imported profile: ${imported.name}`, "success");
    } catch (err) {
      onStatusMessage(
        `Import failed: ${err instanceof Error ? err.message : "Invalid JSON"}`,
        "error"
      );
    }
  };

  const handleDownload = () => {
    const json = exportProfileToJson(profile);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${profile.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onStatusMessage("Profile downloaded", "success");
  };

  const handleFileUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const text = reader.result as string;
          const imported = importProfileFromJson(text);
          onImport(imported);
          onStatusMessage(`Imported: ${imported.name}`, "success");
        } catch (err) {
          onStatusMessage(
            `Import failed: ${err instanceof Error ? err.message : "Invalid file"}`,
            "error"
          );
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="import-export-section">
      <h3>Import / Export Profile</h3>

      <div className="ie-btn-row">
        <button className="ie-btn" onClick={handleExport}>
          Export to JSON
        </button>
        <button className="ie-btn" onClick={handleDownload}>
          Download .json
        </button>
      </div>

      <div className="ie-btn-row">
        <button className="ie-btn" onClick={handleFileUpload}>
          Upload .json File
        </button>
        <button className="ie-btn" onClick={handleImport}>
          Import from Text
        </button>
      </div>

      <textarea
        className="ie-textarea"
        placeholder="Paste JSON here to import, or click Export to see current profile..."
        value={jsonText}
        onChange={(e) => setJsonText(e.target.value)}
      />
    </div>
  );
}
