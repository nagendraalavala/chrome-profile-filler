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
  const [isEditingKey, setIsEditingKey] = useState(false);
  const [keyValue, setKeyValue] = useState(field.label);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isMultiLine = (field.value || "").includes("\n");

  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  const handleKeyEdit = () => {
    const trimmed = keyValue.trim();
    if (trimmed) {
      const newKey = trimmed
        .replace(/\s+/g, "_")
        .replace(/^./, (c) => c.toLowerCase());
      onUpdate({ ...field, label: trimmed, key: newKey });
    } else {
      setKeyValue(field.label);
    }
    setIsEditingKey(false);
  };

  return (
    <div className={`field-row ${isMultiLine ? "field-row-multiline" : ""}`}>
      {isEditingKey ? (
        <input
          className="field-key-input"
          type="text"
          value={keyValue}
          onChange={(e) => setKeyValue(e.target.value)}
          onBlur={handleKeyEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleKeyEdit();
            if (e.key === "Escape") {
              setKeyValue(field.label);
              setIsEditingKey(false);
            }
          }}
          autoFocus
        />
      ) : (
        <span
          className="field-label editable"
          title={`Key: ${field.key} (click to rename)`}
          onClick={() => {
            setKeyValue(field.label);
            setIsEditingKey(true);
          }}
        >
          {field.label}
        </span>
      )}
      <textarea
        ref={textareaRef}
        className="field-input field-textarea"
        value={field.value || ""}
        placeholder={`Enter ${field.label.toLowerCase()}`}
        rows={isMultiLine ? Math.min((field.value || "").split("\n").length, 8) : 1}
        onChange={(e) => {
          onUpdate({ ...field, value: e.target.value });
          autoResize(e.target);
        }}
        onFocus={(e) => autoResize(e.target)}
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
            onClick={(e) => {
              e.stopPropagation();
              setRenameValue(field.label);
              setIsRenaming(true);
            }}
            title="Rename group"
          >
            ✎
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete group"
          >
            &#x1F5D1;
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
    const field = fields[index];
    if (field.type === "GROUP") {
      const childCount = (field.children || []).length;
      const msg = childCount > 0
        ? `Delete group "${field.label}" and its ${childCount} item(s)?`
        : `Delete group "${field.label}"?`;
      if (!window.confirm(msg)) return;
    }
    onChange(fields.filter((_, i) => i !== index));
  };

  // At depth 0, find the index where groups start so we can insert add buttons between flat fields and groups
  const firstGroupIndex = depth === 0
    ? fields.findIndex((f) => f.type === "GROUP")
    : -1;

  const addFlatField = () => {
    const newField: ProfileField = {
      id: generateId(),
      key: "newField",
      label: "New Field",
      type: "FIELD",
      value: "",
    };
    // Insert before the first group, or at the end if no groups
    const insertAt = firstGroupIndex >= 0 ? firstGroupIndex : fields.length;
    const newFields = [...fields];
    newFields.splice(insertAt, 0, newField);
    onChange(newFields);
  };

  const addFlatAttachment = () => {
    const newAttachment: ProfileField = {
      id: generateId(),
      key: "newDocument",
      label: "New Document",
      type: "ATTACHMENT",
      value: "",
    };
    const insertAt = firstGroupIndex >= 0 ? firstGroupIndex : fields.length;
    const newFields = [...fields];
    newFields.splice(insertAt, 0, newAttachment);
    onChange(newFields);
  };

  return (
    <div>
      {fields.map((field, index) => {
        // At depth 0, render inline add buttons right before the first group
        const showInlineAddBtns = depth === 0 && firstGroupIndex >= 0 && index === firstGroupIndex;

        const node = (() => {
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
        })();

        if (showInlineAddBtns) {
          return (
            <React.Fragment key={`${field.id}-with-btns`}>
              <div className="add-btn-row" style={{ padding: "4px 4px 8px" }}>
                <button className="add-btn" onClick={addFlatField}>
                  + Field
                </button>
                <button className="add-btn" onClick={addFlatAttachment}>
                  + Document
                </button>
              </div>
              {node}
            </React.Fragment>
          );
        }

        return node;
      })}
      {/* If there are no groups, show add buttons at the end of flat fields */}
      {depth === 0 && firstGroupIndex < 0 && fields.length > 0 && (
        <div className="add-btn-row" style={{ padding: "4px 4px 8px" }}>
          <button className="add-btn" onClick={addFlatField}>
            + Field
          </button>
          <button className="add-btn" onClick={addFlatAttachment}>
            + Document
          </button>
        </div>
      )}
    </div>
  );
}
