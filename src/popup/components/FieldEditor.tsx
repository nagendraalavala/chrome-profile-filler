import React, { useState } from "react";
import { ProfileField } from "../../models/profile";
import { generateId } from "../../utils/ids";

interface FieldEditorProps {
  fields: ProfileField[];
  onChange: (fields: ProfileField[]) => void;
  depth?: number;
}

function FieldRow({
  field,
  onUpdate,
  onDelete,
}: {
  field: ProfileField;
  onUpdate: (updated: ProfileField) => void;
  onDelete: () => void;
}) {
  return (
    <div className="field-row">
      <span className="field-label" title={field.key}>
        {field.label}
      </span>
      <input
        className="field-input"
        type="text"
        value={field.value || ""}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        onChange={(e) => onUpdate({ ...field, value: e.target.value })}
      />
      <button
        className="field-delete-btn"
        onClick={onDelete}
        title="Remove field"
      >
        &times;
      </button>
    </div>
  );
}

function GroupEditor({
  field,
  onUpdate,
  onDelete,
  depth,
}: {
  field: ProfileField;
  onUpdate: (updated: ProfileField) => void;
  onDelete: () => void;
  depth: number;
}) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(field.label);

  const isCollapsed = field.collapsed ?? false;

  const toggleCollapse = () => {
    onUpdate({ ...field, collapsed: !isCollapsed });
  };

  const handleRename = () => {
    const newKey = renameValue
      .replace(/\s+/g, "")
      .replace(/^./, (c) => c.toLowerCase());
    onUpdate({ ...field, label: renameValue, key: newKey });
    setIsRenaming(false);
  };

  const updateChildren = (newChildren: ProfileField[]) => {
    onUpdate({ ...field, children: newChildren });
  };

  const addChildField = () => {
    const newField: ProfileField = {
      id: generateId(),
      key: "newField",
      label: "New Field",
      type: "FIELD",
      value: "",
    };
    onUpdate({ ...field, children: [...(field.children || []), newField] });
  };

  const addChildGroup = () => {
    const newGroup: ProfileField = {
      id: generateId(),
      key: "newGroup",
      label: "New Group",
      type: "GROUP",
      children: [],
      collapsed: false,
    };
    onUpdate({ ...field, children: [...(field.children || []), newGroup] });
  };

  return (
    <div className="field-group" style={{ marginLeft: depth > 0 ? 8 : 0 }}>
      <div className="group-header" onClick={toggleCollapse}>
        <span className={`collapse-icon ${isCollapsed ? "collapsed" : ""}`}>
          ▼
        </span>
        {isRenaming ? (
          <input
            className="group-label-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            onClick={(e) => e.stopPropagation()}
            autoFocus
          />
        ) : (
          <span className="group-label">{field.label}</span>
        )}
        <div className="group-actions" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => {
              setRenameValue(field.label);
              setIsRenaming(true);
            }}
            title="Rename group"
          >
            ✎
          </button>
          <button onClick={onDelete} title="Delete group">
            🗑
          </button>
        </div>
      </div>
      {!isCollapsed && (
        <div className="group-children">
          <FieldEditor
            fields={field.children || []}
            onChange={updateChildren}
            depth={depth + 1}
          />
          <div className="add-btn-row">
            <button className="add-btn" onClick={addChildField}>
              + Field
            </button>
            <button className="add-btn" onClick={addChildGroup}>
              + Sub-group
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FieldEditor({
  fields,
  onChange,
  depth = 0,
}: FieldEditorProps) {
  const updateField = (index: number, updated: ProfileField) => {
    const newFields = [...fields];
    newFields[index] = updated;
    onChange(newFields);
  };

  const deleteField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div>
      {fields.map((field, index) => {
        if (field.type === "GROUP") {
          return (
            <GroupEditor
              key={field.id}
              field={field}
              onUpdate={(updated) => updateField(index, updated)}
              onDelete={() => deleteField(index)}
              depth={depth}
            />
          );
        }

        if (depth === 0) {
          return (
            <div className="flat-field" key={field.id}>
              <FieldRow
                field={field}
                onUpdate={(updated) => updateField(index, updated)}
                onDelete={() => deleteField(index)}
              />
            </div>
          );
        }

        return (
          <FieldRow
            key={field.id}
            field={field}
            onUpdate={(updated) => updateField(index, updated)}
            onDelete={() => deleteField(index)}
          />
        );
      })}
    </div>
  );
}
