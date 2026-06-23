import React, { useState, useEffect, useCallback } from "react";
import { ResponseTemplate, DEFAULT_CATEGORIES } from "../../models/template";
import {
  getTemplates,
  addTemplate,
  updateTemplate,
  deleteTemplate,
} from "../../storage/templateStorage";

interface TemplateManagerProps {
  onInsert: (content: string) => void;
}

export default function TemplateManager({ onInsert }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<ResponseTemplate[]>([]);
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [formContent, setFormContent] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const loadTemplates = useCallback(async () => {
    const loaded = await getTemplates();
    setTemplates(loaded);
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const categories = Array.from(
    new Set(["All", ...DEFAULT_CATEGORIES, ...templates.map((t) => t.category)]),
  );

  const filteredTemplates = templates.filter((t) => {
    const matchesCategory = filterCategory === "All" || t.category === filterCategory;
    const matchesSearch =
      !searchQuery ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSave = async () => {
    if (!formName.trim() || !formContent.trim()) return;
    if (editId) {
      await updateTemplate(editId, {
        name: formName.trim(),
        category: formCategory,
        content: formContent,
      });
    } else {
      await addTemplate(formName.trim(), formCategory, formContent);
    }
    setIsEditing(false);
    setEditId(null);
    setFormName("");
    setFormCategory(DEFAULT_CATEGORIES[0]);
    setFormContent("");
    await loadTemplates();
  };

  const handleEdit = (template: ResponseTemplate) => {
    setEditId(template.id);
    setFormName(template.name);
    setFormCategory(template.category);
    setFormContent(template.content);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await deleteTemplate(id);
    await loadTemplates();
  };

  const handleInsert = (template: ResponseTemplate) => {
    onInsert(template.content);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditId(null);
    setFormName("");
    setFormCategory(DEFAULT_CATEGORIES[0]);
    setFormContent("");
  };

  if (isEditing) {
    return (
      <div className="template-editor">
        <h3>{editId ? "Edit Template" : "New Template"}</h3>
        <div className="template-form">
          <input
            type="text"
            className="template-input"
            placeholder="Template name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
          />
          <select
            className="template-select"
            value={formCategory}
            onChange={(e) => setFormCategory(e.target.value)}
          >
            {DEFAULT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <textarea
            className="template-textarea"
            placeholder="Template content... Use {{firstName}}, {{email}}, etc. for profile placeholders"
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            rows={6}
          />
          <div className="template-form-actions">
            <button className="template-btn save" onClick={handleSave}>
              {editId ? "Update" : "Create"}
            </button>
            <button className="template-btn cancel" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="template-manager">
      <div className="template-toolbar">
        <input
          type="text"
          className="template-search"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <select
          className="template-filter"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        <button
          className="template-btn add"
          onClick={() => setIsEditing(true)}
          title="Create new template"
        >
          + New
        </button>
      </div>

      {filteredTemplates.length === 0 ? (
        <div className="template-empty">
          <p>No templates yet.</p>
          <p>Create templates for common responses — cover letters, email replies, form answers.</p>
        </div>
      ) : (
        <div className="template-list">
          {filteredTemplates.map((t) => (
            <div key={t.id} className="template-card">
              <div className="template-card-header">
                <span className="template-name">{t.name}</span>
                <span className="template-category-badge">{t.category}</span>
              </div>
              <div className="template-preview">
                {t.content.length > 100 ? t.content.slice(0, 100) + "..." : t.content}
              </div>
              <div className="template-card-actions">
                <button
                  className="template-btn insert"
                  onClick={() => handleInsert(t)}
                  title="Insert into active text field"
                >
                  Insert
                </button>
                <button
                  className="template-btn edit"
                  onClick={() => handleEdit(t)}
                  title="Edit template"
                >
                  Edit
                </button>
                <button
                  className="template-btn delete"
                  onClick={() => handleDelete(t.id)}
                  title="Delete template"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
