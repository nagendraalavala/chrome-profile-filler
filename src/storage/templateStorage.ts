import { ResponseTemplate } from "../models/template";
import { generateId } from "../utils/ids";

const TEMPLATES_KEY = "pf_templates";

function getStorage(): typeof chrome.storage.local | null {
  if (typeof chrome !== "undefined" && chrome.storage) {
    return chrome.storage.local;
  }
  return null;
}

async function get<T>(key: string, defaultValue: T): Promise<T> {
  const storage = getStorage();
  if (!storage) {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaultValue;
  }
  return new Promise((resolve) => {
    storage.get(key, (result) => {
      resolve(result[key] !== undefined ? (result[key] as T) : defaultValue);
    });
  });
}

async function set<T>(key: string, value: T): Promise<void> {
  const storage = getStorage();
  if (!storage) {
    localStorage.setItem(key, JSON.stringify(value));
    return;
  }
  return new Promise((resolve) => {
    storage.set({ [key]: value }, resolve);
  });
}

export async function getTemplates(): Promise<ResponseTemplate[]> {
  return get<ResponseTemplate[]>(TEMPLATES_KEY, []);
}

export async function saveTemplates(templates: ResponseTemplate[]): Promise<void> {
  return set(TEMPLATES_KEY, templates);
}

export async function addTemplate(
  name: string,
  category: string,
  content: string,
): Promise<ResponseTemplate> {
  const templates = await getTemplates();
  const now = Date.now();
  const template: ResponseTemplate = {
    id: generateId(),
    name,
    category,
    content,
    createdAt: now,
    updatedAt: now,
  };
  templates.push(template);
  await saveTemplates(templates);
  return template;
}

export async function updateTemplate(
  id: string,
  updates: Partial<Pick<ResponseTemplate, "name" | "category" | "content">>,
): Promise<ResponseTemplate | null> {
  const templates = await getTemplates();
  const idx = templates.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const template = templates[idx];
  if (updates.name !== undefined) template.name = updates.name;
  if (updates.category !== undefined) template.category = updates.category;
  if (updates.content !== undefined) template.content = updates.content;
  template.updatedAt = Date.now();
  templates[idx] = template;
  await saveTemplates(templates);
  return template;
}

export async function deleteTemplate(id: string): Promise<void> {
  const templates = await getTemplates();
  const filtered = templates.filter((t) => t.id !== id);
  await saveTemplates(filtered);
}
