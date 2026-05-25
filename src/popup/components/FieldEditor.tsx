import React, { useState, useRef } from "react";
import { ProfileField, DocumentInfo } from "../../models/profile";
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

function AttachmentRow({
  field,
  onUpdate,
  onDelete,
}: {
  field: ProfileField;
  onUpdate: (updated: ProfileField) => void;
  onDelete: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const attachment: DocumentInfo = {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        dataUrl,
      };
      onUpdate({ ...field, attachment, value: file.name });
    };
    reader.readAsDataURL(file);
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="field-row attachment-row">
      <span className="field-label" title={field.key}>
        {field.label}
      </span>
      <div className="attachment-input">
        {field.attachment ? (
          <div className="attachment-info">
            <span className="attachment-name" title={field.attachment.fileName}>
              {field.attachment.fileName}
            </span>
            <span className="attachment-size">
              {formatSize(field.attachment.size)}
            </span>
            <button
              className="attachment-change-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Change file"
            >
              Change
            </button>
          </div>
        ) : (
          <button
            className="attachment-upload-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: "none" }}
          onChange={handleFileSelect}
        />
      </div>
      <button
        className="field-delete-btn"
        onClick={onDelete}
        title="Remove attachment"
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

  const addChildAttachment = () => {
    const newAttachment: ProfileField = {
      id: generateId(),
      key: "newDocument",
      label: "New Document",
      type: "ATTACHMENT",
      value: "",
    };
    onUpdate({ ...field, children: [...(field.children || []), newAttachment] });
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
            <button className="add-btn" onClick={addChildAttachment}>
              + Document
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

        if (field.type === "ATTACHMENT") {
          if (depth === 0) {
            return (
              <div className="flat-field" key={field.id}>
                <AttachmentRow
                  field={field}
                  onUpdate={(updated) => updateField(index, updated)}
                  onDelete={() => deleteField(index)}
                />
              </div>
            );
          }
          return (
            <AttachmentRow
              key={field.id}
              field={field}
              onUpdate={(updated) => updateField(index, updated)}
              onDelete={() => deleteField(index)}
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
