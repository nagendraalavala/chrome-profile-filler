import React from "react";
import { MatchResult, FlattenedField } from "../../models/profile";

interface PreviewTableProps {
  matches: MatchResult[];
  profileFields: FlattenedField[];
  onToggle: (index: number) => void;
  onChangeMapping: (index: number, newProfileKey: string) => void;
}

function confidenceClass(confidence: number): string {
  if (confidence >= 0.8) return "confidence-high";
  if (confidence >= 0.5) return "confidence-medium";
  if (confidence > 0) return "confidence-low";
  return "confidence-none";
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.5) return "Medium";
  if (confidence > 0) return "Low";
  return "None";
}

export default function PreviewTable({
  matches,
  profileFields,
  onToggle,
  onChangeMapping,
}: PreviewTableProps) {
  // Group matches by their group prefix
  const grouped = new Map<string, { index: number; match: MatchResult }[]>();
  const ungrouped: { index: number; match: MatchResult }[] = [];

  matches.forEach((match, index) => {
    if (match.group) {
      const existing = grouped.get(match.group) || [];
      existing.push({ index, match });
      grouped.set(match.group, existing);
    } else {
      ungrouped.push({ index, match });
    }
  });

  const renderTable = (
    items: { index: number; match: MatchResult }[]
  ) => (
    <table className="preview-table">
      <thead>
        <tr>
          <th style={{ width: 30 }}></th>
          <th>Form Field</th>
          <th>Profile Key</th>
          <th>Value</th>
          <th style={{ width: 60 }}>Match</th>
        </tr>
      </thead>
      <tbody>
        {items.map(({ index, match }) => (
          <tr key={index}>
            <td>
              <input
                type="checkbox"
                className="preview-checkbox"
                checked={match.selected}
                onChange={() => onToggle(index)}
              />
            </td>
            <td title={match.formFieldName}>
              {match.sectionHeading && (
                <span className="section-tag">{match.sectionHeading}</span>
              )}
              {match.formFieldLabel}
            </td>
            <td>
              <select
                className="preview-select"
                value={match.profileKey}
                onChange={(e) => onChangeMapping(index, e.target.value)}
              >
                <option value="">— unmapped —</option>
                {profileFields.map((pf) => (
                  <option key={pf.dotKey} value={pf.dotKey}>
                    {pf.dotKey}
                  </option>
                ))}
              </select>
            </td>
            <td>
              {match.isAttachment && match.attachment ? (
                <span className="attachment-badge" title={match.attachment.fileName}>
                  {match.attachment.fileName}
                </span>
              ) : (
                match.value || "—"
              )}
            </td>
            <td>
              <span
                className={`confidence-badge ${confidenceClass(match.confidence)}`}
              >
                {confidenceLabel(match.confidence)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const groupNames = Array.from(grouped.keys());

  return (
    <div className="preview-section">
      {ungrouped.length > 0 && (
        <div className="preview-group">
          <div className="preview-group-header">Personal Information</div>
          {renderTable(ungrouped)}
        </div>
      )}
      {groupNames.map((groupName) => {
        const items = grouped.get(groupName) || [];
        const displayName = groupName
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (c) => c.toUpperCase())
          .trim();
        return (
          <div className="preview-group" key={groupName}>
            <div className="preview-group-header">{displayName}</div>
            {renderTable(items)}
          </div>
        );
      })}
      {matches.length === 0 && (
        <div className="no-results">
          <p>No form fields detected.</p>
          <p>Navigate to a page with a form and click "Scan Form".</p>
        </div>
      )}
    </div>
  );
}
