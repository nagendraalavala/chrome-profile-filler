import { FormFieldInfo, ExtensionMessage } from "../models/profile";

function findLabel(element: HTMLElement): string {
  const id = element.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() || "";
  }

  const parentLabel = element.closest("label");
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const inputs = clone.querySelectorAll("input, select, textarea");
    inputs.forEach((el) => el.remove());
    return clone.textContent?.trim() || "";
  }

  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl) return labelEl.textContent?.trim() || "";
  }

  const prev = element.previousElementSibling;
  if (prev && (prev.tagName === "LABEL" || prev.tagName === "SPAN")) {
    return prev.textContent?.trim() || "";
  }

  const role = element.getAttribute("role");
  if (role === "textbox" || role === "combobox") {
    const ariaDesc = element.getAttribute("aria-describedby");
    if (ariaDesc) {
      const descEl = document.getElementById(ariaDesc);
      if (descEl) return descEl.textContent?.trim() || "";
    }
  }

  const dataPlaceholder = element.getAttribute("data-placeholder");
  if (dataPlaceholder) return dataPlaceholder;

  return "";
}

function findLabelInDocument(element: HTMLElement, doc: Document): string {
  const id = element.getAttribute("id");
  if (id) {
    const label = doc.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() || "";
  }
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;
  return "";
}

function findSectionHeading(element: HTMLElement): string {
  let current: HTMLElement | null = element;
  const maxLevels = 10;
  let level = 0;

  while (current && level < maxLevels) {
    current = current.parentElement;
    level++;

    if (!current) break;

    const heading = current.querySelector("h1, h2, h3, h4, h5, h6, legend, [role='heading']");
    if (heading) {
      return heading.textContent?.trim() || "";
    }

    if (current.tagName === "FIELDSET") {
      const legend = current.querySelector("legend");
      if (legend) return legend.textContent?.trim() || "";
    }

    const sectionLabel = current.getAttribute("aria-label") || current.getAttribute("data-section");
    if (sectionLabel) return sectionLabel;
  }

  return "";
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
    return false;
  }
  // offsetParent is null for position:fixed elements and their ancestors,
  // which is common in Gmail, Outlook, and other SPA email clients.
  // Fall back to bounding rect check for those cases.
  if (element.offsetParent === null) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }
  return true;
}

function isEditableElement(el: HTMLElement): boolean {
  return (
    el.isContentEditable ||
    el.getAttribute("contenteditable") === "true" ||
    el.getAttribute("contenteditable") === "" ||
    el.getAttribute("role") === "textbox" ||
    el.getAttribute("role") === "combobox"
  );
}

function getEditablePlaceholder(el: HTMLElement): string {
  return (
    el.getAttribute("data-placeholder") ||
    el.getAttribute("aria-placeholder") ||
    el.getAttribute("placeholder") ||
    ""
  );
}

// ---------------------------------------------------------------------------
// Template scanning: detect label patterns in contenteditable text.
// Supports multiple formats including colon, star, tab-separated, dash,
// pipe, arrow, equals, underscore placeholders, and bare key lines.
// ---------------------------------------------------------------------------

type TemplateFormat = "colon" | "star" | "tab" | "dash" | "pipe" | "arrow" | "equals" | "underscore" | "bare" | "table";

interface DetectedLabel {
  label: string;
  format: TemplateFormat;
}

function isValidLabel(label: string): boolean {
  return label.length >= 2 && /^[A-Za-z]/.test(label);
}

function isSkippableLine(trimmed: string): boolean {
  if (!trimmed) return true;
  if (trimmed.length > 80) return true;
  if (trimmed.startsWith("http") || trimmed.startsWith("www.")) return true;
  if (trimmed.includes("@") && !trimmed.endsWith(":")) return true;
  return false;
}

function extractTemplateLabels(element: HTMLElement): DetectedLabel[] {
  const text = element.innerText || element.textContent || "";
  const lines = text.split("\n");
  const results: DetectedLabel[] = [];

  // Track bare-key candidates separately; only include them if
  // we find at least 2 short capitalized lines with no other format.
  const bareCandidates: DetectedLabel[] = [];

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (isSkippableLine(trimmed)) continue;

    // --- 1. Colon format: "Full Name:" or "LinkedIn***:" ---
    let match = trimmed.match(/^(.+?)\s*[*]*:\s*$/);
    if (match && isValidLabel(match[1].trim())) {
      results.push({ label: match[1].trim(), format: "colon" });
      continue;
    }

    // --- 2. Colon with existing value: "Full Name: John" (key\t before value) ---
    match = trimmed.match(/^(.+?)\s*[*]*:\s+(.+)$/);
    if (match && isValidLabel(match[1].trim())) {
      results.push({ label: match[1].trim(), format: "colon" });
      continue;
    }

    // --- 3. Star format: "Visa Status*" ---
    match = trimmed.match(/^([A-Za-z].+?)\s*\*+\s*$/);
    if (match && isValidLabel(match[1].trim())) {
      results.push({ label: match[1].trim(), format: "star" });
      continue;
    }

    // --- 4. Tab-separated: "Full Name\t" or "Full Name\tvalue" ---
    if (rawLine.includes("\t")) {
      const parts = rawLine.split("\t");
      const key = parts[0].trim();
      if (isValidLabel(key)) {
        results.push({ label: key, format: "tab" });
        continue;
      }
    }

    // --- 5. Pipe format: "Full Name |" or "Full Name | value" ---
    match = trimmed.match(/^([A-Za-z].+?)\s*\|\s*(.*)$/);
    if (match && isValidLabel(match[1].trim())) {
      results.push({ label: match[1].trim(), format: "pipe" });
      continue;
    }

    // --- 6. Arrow format: "Full Name =>" or "Full Name ->" ---
    match = trimmed.match(/^([A-Za-z].+?)\s*(?:=>|->)\s*(.*)$/);
    if (match && isValidLabel(match[1].trim())) {
      results.push({ label: match[1].trim(), format: "arrow" });
      continue;
    }

    // --- 7. Equals format: "Full Name =" or "Full Name = value" ---
    match = trimmed.match(/^([A-Za-z].+?)\s*=\s*(.*)$/);
    if (match && isValidLabel(match[1].trim())) {
      results.push({ label: match[1].trim(), format: "equals" });
      continue;
    }

    // --- 8. Dash separator: "Full Name - " or "Full Name – " ---
    match = trimmed.match(/^([A-Za-z].+?)\s+[-–—]\s*(.*)$/);
    if (match && isValidLabel(match[1].trim())) {
      results.push({ label: match[1].trim(), format: "dash" });
      continue;
    }

    // --- 9. Underscore placeholder: "Full Name ____" or "Full Name: ___" ---
    match = trimmed.match(/^([A-Za-z].+?)\s*:?\s*_{2,}\s*$/);
    if (match && isValidLabel(match[1].trim())) {
      results.push({ label: match[1].trim(), format: "underscore" });
      continue;
    }

    // --- 10. Bare key candidate: short capitalized line with no value ---
    // Only treated as labels if enough such lines appear together.
    if (/^[A-Za-z][A-Za-z0-9 /().#]{1,40}$/.test(trimmed) && !trimmed.includes("  ")) {
      bareCandidates.push({ label: trimmed, format: "bare" });
    }
  }

  // Include bare candidates if we found at least 2 AND no other formats
  // were detected (to avoid false positives on normal paragraph text).
  if (results.length === 0 && bareCandidates.length >= 2) {
    results.push(...bareCandidates);
  }

  return results;
}

function scanTemplateFields(element: HTMLElement): FormFieldInfo[] {
  const detected = extractTemplateLabels(element);
  if (detected.length < 2) return [];

  return detected.map((d) => ({
    element,
    name: d.label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase(),
    id: "",
    label: d.label,
    type: "template-field",
    placeholder: "",
    sectionHeading: "",
    autocomplete: "",
    isContentEditable: true,
    isTemplateField: true,
    templateLabel: d.label,
    templateFormat: d.format,
  }));
}

// ---------------------------------------------------------------------------
// Table scanning: detect key-value pairs in HTML tables inside editable areas
// (e.g. email templates with tabular layout: left cell = label, right cell = value)
// ---------------------------------------------------------------------------

function isSectionHeaderRow(row: Element): string | null {
  const cells = row.querySelectorAll("td, th");
  if (cells.length === 0) return null;

  const firstCell = cells[0] as HTMLElement;
  const firstText = (firstCell.textContent || "").trim();
  if (!firstText) return null;

  // Only treat as section header if the row truly spans the full width:
  // 1. Single cell only, OR
  // 2. First cell has colspan covering all columns
  const colspan = parseInt(firstCell.getAttribute("colspan") || "1", 10);
  const isSingleCell = cells.length === 1;
  const isSpanning = colspan >= 2;

  if (!isSingleCell && !isSpanning) return null;

  const cleaned = firstText.replace(/[:\s*]+$/, "").trim();
  if (
    cleaned.length >= 3 &&
    cleaned.length <= 60 &&
    /^[A-Za-z]/.test(cleaned) &&
    !/^\d+\)/.test(cleaned)
  ) {
    return cleaned;
  }
  return null;
}

function scanTableFields(container: HTMLElement): FormFieldInfo[] {
  const fields: FormFieldInfo[] = [];
  const tables = container.querySelectorAll("table");

  for (const table of Array.from(tables)) {
    const rows = table.querySelectorAll("tr");
    let keyValuePairs = 0;

    // First pass: count how many rows look like key-value pairs
    for (const row of Array.from(rows)) {
      const cells = row.querySelectorAll("td, th");
      if (cells.length >= 2) {
        const keyText = (cells[0].textContent || "").trim();
        if (keyText.length >= 2 && /^[A-Za-z]/.test(keyText) && keyText.length <= 80) {
          keyValuePairs++;
        }
      }
    }

    // Need at least 2 key-value rows to treat this as a template table
    if (keyValuePairs < 2) continue;

    // Second pass: create field entries, tracking inline section headers
    const tableHeading = findSectionHeading(table as HTMLElement);
    let currentSection = tableHeading;

    for (const row of Array.from(rows)) {
      // Check if this row is a section header (e.g. "References:", "Candidate Details:")
      const sectionHeader = isSectionHeaderRow(row);
      if (sectionHeader) {
        currentSection = sectionHeader;
        continue;
      }

      const cells = row.querySelectorAll("td, th");
      if (cells.length < 2) continue;

      const keyCell = cells[0];
      const valueCell = cells[cells.length - 1];
      const keyText = (keyCell.textContent || "").trim();

      // Skip if key cell is empty, too short, or too long
      if (keyText.length < 2 || keyText.length > 80) continue;
      if (!/^[A-Za-z]/.test(keyText)) continue;

      // Skip if the key cell and value cell are the same (single-cell row)
      if (keyCell === valueCell) continue;

      // Clean the label: strip trailing colons/stars and leading numbering
      let label = keyText.replace(/[:\s*]+$/, "").trim();
      label = label.replace(/^\d+\)\s*/, "").trim();
      if (label.length < 2) continue;

      fields.push({
        element: valueCell as HTMLElement,
        name: label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase(),
        id: "",
        label,
        type: "template-field",
        placeholder: "",
        sectionHeading: currentSection,
        autocomplete: "",
        isContentEditable: true,
        isTemplateField: true,
        templateLabel: label,
        templateFormat: "table",
      });
    }
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Scanning: contenteditable elements (email composers, rich text editors)
// ---------------------------------------------------------------------------

function scanContentEditableFields(): FormFieldInfo[] {
  const fields: FormFieldInfo[] = [];
  const seen = new WeakSet<HTMLElement>();

  const editables = document.querySelectorAll<HTMLElement>(
    "[contenteditable='true'], [contenteditable=''], [role='textbox'], [role='combobox']"
  );

  editables.forEach((el) => {
    if (seen.has(el)) return;
    if (!isVisible(el)) return;

    // Skip nested contenteditables (child of another editable)
    const parent = el.parentElement;
    if (parent && isEditableElement(parent)) return;

    // Skip tiny elements unlikely to be real text fields
    const rect = el.getBoundingClientRect();
    if (rect.height < 20 || rect.width < 40) return;

    seen.add(el);

    // Check if this contenteditable contains HTML tables with key-value pairs
    const tableFields = scanTableFields(el);
    if (tableFields.length > 0) {
      fields.push(...tableFields);

      // Also scan for text-based template patterns outside the tables
      const templateFields = scanTemplateFields(el);
      if (templateFields.length > 0) {
        fields.push(...templateFields);
      }
      return;
    }

    // Check if this contenteditable contains template patterns (e.g. email reply with "Label:" lines)
    const templateFields = scanTemplateFields(el);
    if (templateFields.length > 0) {
      fields.push(...templateFields);
      return;
    }

    fields.push({
      element: el,
      name: el.getAttribute("name") || el.getAttribute("data-name") || "",
      id: el.getAttribute("id") || "",
      label: findLabel(el),
      type: "contenteditable",
      placeholder: getEditablePlaceholder(el),
      sectionHeading: findSectionHeading(el),
      autocomplete: el.getAttribute("autocomplete") || "",
      isContentEditable: true,
    });
  });

  return fields;
}

// ---------------------------------------------------------------------------
// Scanning: same-origin iframes (TinyMCE, CKEditor, legacy editors)
// ---------------------------------------------------------------------------

function scanIframeFields(): FormFieldInfo[] {
  const fields: FormFieldInfo[] = [];

  const iframes = document.querySelectorAll("iframe");
  iframes.forEach((iframe) => {
    try {
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      // designMode iframes (classic rich text editors)
      if (iframeDoc.designMode === "on") {
        const body = iframeDoc.body;
        if (body) {
          fields.push({
            element: body,
            name: iframe.getAttribute("name") || iframe.getAttribute("data-name") || "",
            id: iframe.getAttribute("id") || "",
            label: findLabel(iframe),
            type: "iframe-editor",
            placeholder: iframe.getAttribute("data-placeholder") || "",
            sectionHeading: findSectionHeading(iframe),
            autocomplete: "",
            isContentEditable: true,
          });
        }
        return;
      }

      // contenteditable body inside iframe
      const iframeBody = iframeDoc.body;
      if (iframeBody && isEditableElement(iframeBody)) {
        fields.push({
          element: iframeBody,
          name: iframe.getAttribute("name") || "",
          id: iframe.getAttribute("id") || "",
          label: findLabel(iframe),
          type: "iframe-editor",
          placeholder: iframe.getAttribute("data-placeholder") || "",
          sectionHeading: findSectionHeading(iframe),
          autocomplete: "",
          isContentEditable: true,
        });
        return;
      }

      // Standard form fields inside iframe
      const skipTypes = new Set(["hidden", "submit", "button", "reset", "file", "image", "checkbox", "radio"]);
      const iframeInputs = iframeDoc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input, textarea, select"
      );
      iframeInputs.forEach((el) => {
        if (el instanceof HTMLInputElement && skipTypes.has(el.type)) return;
        const style = iframeDoc.defaultView?.getComputedStyle(el);
        if (style && (style.display === "none" || style.visibility === "hidden")) return;

        fields.push({
          element: el,
          name: el.getAttribute("name") || "",
          id: el.getAttribute("id") || "",
          label: findLabelInDocument(el, iframeDoc),
          type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
          placeholder: el.getAttribute("placeholder") || "",
          sectionHeading: "",
          autocomplete: el.getAttribute("autocomplete") || "",
          isContentEditable: false,
        });
      });

      // contenteditable elements inside iframe
      const iframeEditables = iframeDoc.querySelectorAll<HTMLElement>(
        "[contenteditable='true'], [contenteditable=''], [role='textbox']"
      );
      iframeEditables.forEach((el) => {
        const style = iframeDoc.defaultView?.getComputedStyle(el);
        if (style && (style.display === "none" || style.visibility === "hidden")) return;

        fields.push({
          element: el,
          name: el.getAttribute("name") || el.getAttribute("data-name") || "",
          id: el.getAttribute("id") || "",
          label: el.getAttribute("aria-label") || el.getAttribute("data-placeholder") || "",
          type: "contenteditable",
          placeholder: getEditablePlaceholder(el),
          sectionHeading: "",
          autocomplete: "",
          isContentEditable: true,
        });
      });
    } catch {
      // Cross-origin iframe — cannot access
    }
  });

  return fields;
}

// ---------------------------------------------------------------------------
// Main scan: combines standard inputs + contenteditable + iframes
// ---------------------------------------------------------------------------

function scanFileInputs(): FormFieldInfo[] {
  const fields: FormFieldInfo[] = [];
  // Find all file inputs including hidden ones (Gmail uses hidden file inputs for attachments)
  const fileInputs = document.querySelectorAll<HTMLInputElement>("input[type='file']");

  fileInputs.forEach((el) => {
    // For Gmail/Outlook, include hidden file inputs near compose areas
    const isGmailFileInput = el.closest("[role='dialog']") || el.closest(".compose") ||
                             el.closest("[data-action='composenew']") || el.closest(".dC");
    if (!isVisible(el) && !isGmailFileInput) return;

    fields.push({
      element: el,
      name: el.getAttribute("name") || "attachment",
      id: el.getAttribute("id") || "",
      label: findLabel(el) || "Attachment",
      type: "file",
      placeholder: "",
      sectionHeading: findSectionHeading(el),
      autocomplete: "",
      isFileInput: true,
      acceptTypes: el.getAttribute("accept") || "",
    });
  });

  return fields;
}

/**
 * Scan template text and tables for attachment instructions
 * (e.g. "Attach Resume", "Upload CV", "Resume/CV:" in a table row).
 * Creates virtual file-input fields pointing to the compose area's file input
 * or the compose area itself for drag-and-drop.
 */
function scanAttachmentInstructions(): FormFieldInfo[] {
  const fields: FormFieldInfo[] = [];
  const attachKeywords = /\b(attach|upload|send|include|provide)\b.*\b(resume|cv|curriculum.?vitae|cover.?letter|document|certificate|transcript|passport|id.?card|photo)\b/i;
  const attachLabelPattern = /\b(resume|cv|curriculum.?vitae|cover.?letter)\b/i;

  // Find the Gmail/compose file input to use as the target
  let fileInput: HTMLInputElement | null = null;
  const allFileInputs = document.querySelectorAll<HTMLInputElement>("input[type='file']");
  for (const fi of Array.from(allFileInputs)) {
    const isCompose = fi.closest("[role='dialog']") || fi.closest(".compose") ||
                      fi.closest("[data-action='composenew']") || fi.closest(".dC") ||
                      fi.closest("[contenteditable='true']")?.parentElement;
    if (isCompose) {
      fileInput = fi;
      break;
    }
  }
  if (!fileInput) return fields;

  // Scan contenteditable areas for attachment keywords
  const editables = document.querySelectorAll<HTMLElement>(
    "[contenteditable='true'], [contenteditable=''], [role='textbox']"
  );

  const foundLabels = new Set<string>();

  for (const editable of Array.from(editables)) {
    // Check table cells
    const tables = editable.querySelectorAll("table");
    for (const table of Array.from(tables)) {
      const rows = table.querySelectorAll("tr");
      for (const row of Array.from(rows)) {
        const cells = row.querySelectorAll("td, th");
        if (cells.length < 1) continue;
        const cellText = (cells[0].textContent || "").trim();
        if (attachLabelPattern.test(cellText)) {
          const label = cellText.replace(/[:\s*]+$/, "").trim();
          if (!foundLabels.has(label.toLowerCase())) {
            foundLabels.add(label.toLowerCase());
            fields.push({
              element: fileInput,
              name: label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase(),
              id: "",
              label,
              type: "file",
              placeholder: "",
              sectionHeading: "",
              autocomplete: "",
              isFileInput: true,
              acceptTypes: fileInput.getAttribute("accept") || "",
            });
          }
        }
      }
    }

    // Check plain text for attachment instructions
    const text = editable.textContent || "";
    if (attachKeywords.test(text)) {
      const labelMatch = text.match(attachLabelPattern);
      if (labelMatch) {
        const label = labelMatch[0];
        if (!foundLabels.has(label.toLowerCase())) {
          foundLabels.add(label.toLowerCase());
          fields.push({
            element: fileInput,
            name: label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase(),
            id: "",
            label,
            type: "file",
            placeholder: "",
            sectionHeading: "",
            autocomplete: "",
            isFileInput: true,
            acceptTypes: fileInput.getAttribute("accept") || "",
          });
        }
      }
    }
  }

  return fields;
}

function scanFormFields(): FormFieldInfo[] {
  const selector = "input, textarea, select";
  const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);
  const fields: FormFieldInfo[] = [];
  const skipTypes = new Set(["hidden", "submit", "button", "reset", "file", "image", "checkbox", "radio"]);

  elements.forEach((el) => {
    if (el instanceof HTMLInputElement && skipTypes.has(el.type)) return;
    if (!isVisible(el)) return;

    fields.push({
      element: el,
      name: el.getAttribute("name") || "",
      id: el.getAttribute("id") || "",
      label: findLabel(el),
      type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
      placeholder: el.getAttribute("placeholder") || "",
      sectionHeading: findSectionHeading(el),
      autocomplete: el.getAttribute("autocomplete") || "",
      isContentEditable: false,
    });
  });

  // Scan contenteditable elements (email composers, rich text editors, docs)
  const editableFields = scanContentEditableFields();
  fields.push(...editableFields);

  // Only scan standalone tables on the page when no editable compose
  // areas were found (avoids picking up email thread content in Gmail)
  if (editableFields.length === 0) {
    const pageTableFields = scanTableFields(document.body);
    const existingElements = new WeakSet<Element>(fields.map((f) => f.element));
    for (const tf of pageTableFields) {
      if (!existingElements.has(tf.element)) {
        fields.push(tf);
      }
    }
  }

  // Scan same-origin iframes for fields and editors
  const iframeFields = scanIframeFields();
  fields.push(...iframeFields);

  // Scan file input fields for attachment support
  const fileFields = scanFileInputs();
  fields.push(...fileFields);

  // Scan template text for attachment instructions (e.g. "attach resume")
  const attachInstructions = scanAttachmentInstructions();
  const existingFileElements = new WeakSet<Element>(fileFields.map((f) => f.element));
  for (const ai of attachInstructions) {
    if (!existingFileElements.has(ai.element)) {
      fields.push(ai);
    }
  }

  return fields;
}

/**
 * Scan only the user's selected/highlighted region of the page.
 * Finds the nearest common ancestor of the selection and scans within it.
 */
function selectionIntersectsField(
  selection: Selection,
  field: FormFieldInfo,
): boolean {
  // For table fields, check if the ROW intersects the selection
  // (user may select the label cell, not the value cell)
  if (field.templateFormat === "table") {
    const row = field.element.closest("tr");
    if (row) return selection.containsNode(row, true);
  }
  return selection.containsNode(field.element, true);
}

function scanSelectionFields(): FormFieldInfo[] {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return [];
  }

  // Get the container element that encompasses the selection
  const range = selection.getRangeAt(0);
  let container = range.commonAncestorContainer as HTMLElement;
  if (container.nodeType === Node.TEXT_NODE) {
    container = container.parentElement as HTMLElement;
  }
  if (!container) return [];

  // Expand from a cell/row up to the full table for proper table scanning
  const parentTable = container.closest("table");
  if (parentTable) {
    container = parentTable as HTMLElement;
  }

  const fields: FormFieldInfo[] = [];
  const skipTypes = new Set(["hidden", "submit", "button", "reset", "file", "image", "checkbox", "radio"]);

  // Scan form inputs within the selection container
  const formElements = container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
    "input, textarea, select"
  );
  formElements.forEach((el) => {
    if (el instanceof HTMLInputElement && skipTypes.has(el.type)) return;
    if (!isVisible(el)) return;
    if (!selection.containsNode(el, true)) return;

    fields.push({
      element: el,
      name: el.getAttribute("name") || "",
      id: el.getAttribute("id") || "",
      label: findLabel(el),
      type: el instanceof HTMLInputElement ? el.type : el.tagName.toLowerCase(),
      placeholder: el.getAttribute("placeholder") || "",
      sectionHeading: findSectionHeading(el),
      autocomplete: el.getAttribute("autocomplete") || "",
      isContentEditable: false,
    });
  });

  // Scan tables within the selection (check row intersection for table fields)
  const tableFields = scanTableFields(container);
  for (const tf of tableFields) {
    if (selectionIntersectsField(selection, tf)) {
      fields.push(tf);
    }
  }

  // Scan contenteditable elements within/containing the selection
  const editableAncestor = container.closest(
    "[contenteditable='true'], [contenteditable=''], [role='textbox']"
  ) as HTMLElement | null;

  if (editableAncestor) {
    const tblFields = scanTableFields(editableAncestor);
    const templateFields = scanTemplateFields(editableAncestor);
    const existingElements = new WeakSet<Element>(fields.map((f) => f.element));

    for (const f of [...tblFields, ...templateFields]) {
      if (!existingElements.has(f.element) && selectionIntersectsField(selection, f)) {
        fields.push(f);
      }
    }
  } else {
    const editables = container.querySelectorAll<HTMLElement>(
      "[contenteditable='true'], [contenteditable=''], [role='textbox']"
    );
    const existingElements = new WeakSet<Element>(fields.map((f) => f.element));

    editables.forEach((el) => {
      if (!selection.containsNode(el, true)) return;
      if (!isVisible(el)) return;

      const tblFields = scanTableFields(el);
      const templateFields = scanTemplateFields(el);

      for (const f of [...tblFields, ...templateFields]) {
        if (!existingElements.has(f.element) && selectionIntersectsField(selection, f)) {
          fields.push(f);
        }
      }
    });
  }

  return fields;
}

function serializeFormFields(fields: FormFieldInfo[]): Array<Omit<FormFieldInfo, "element"> & { index: number }> {
  return fields.map((f, index) => ({
    index,
    name: f.name,
    id: f.id,
    label: f.label,
    type: f.type,
    placeholder: f.placeholder,
    sectionHeading: f.sectionHeading,
    autocomplete: f.autocomplete,
    isContentEditable: f.isContentEditable,
    isFileInput: f.isFileInput,
    acceptTypes: f.acceptTypes,
    isTemplateField: f.isTemplateField,
    templateLabel: f.templateLabel,
    templateFormat: f.templateFormat,
  }));
}

// ---------------------------------------------------------------------------
// Fill logic: standard inputs, selects, contenteditable, iframes, files
// ---------------------------------------------------------------------------

function dataUrlToFile(dataUrl: string, fileName: string): File {
  const [header, base64Data] = dataUrl.split(",");
  const mimeMatch = header.match(/:(.*?);/);
  const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const byteString = atob(base64Data);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new File([ab], fileName, { type: mimeType });
}

function fillFileInput(
  element: HTMLInputElement,
  dataUrl: string,
  fileName: string
): boolean {
  try {
    const file = dataUrlToFile(dataUrl, fileName);
    const dt = new DataTransfer();
    dt.items.add(file);
    element.files = dt.files;
    element.dispatchEvent(new Event("change", { bubbles: true }));
    element.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Drop a file onto an element using drag-and-drop events.
 * This works for Gmail/Outlook compose areas where hidden file inputs
 * may not accept direct .files assignment.
 */
function dropFileOnElement(
  element: HTMLElement,
  dataUrl: string,
  fileName: string
): boolean {
  try {
    const file = dataUrlToFile(dataUrl, fileName);
    const dt = new DataTransfer();
    dt.items.add(file);

    const dragEnterEvent = new DragEvent("dragenter", {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt,
    });
    element.dispatchEvent(dragEnterEvent);

    const dragOverEvent = new DragEvent("dragover", {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt,
    });
    element.dispatchEvent(dragOverEvent);

    const dropEvent = new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt,
    });
    element.dispatchEvent(dropEvent);

    return true;
  } catch {
    return false;
  }
}

function fillContentEditable(element: HTMLElement, value: string): void {
  element.focus();

  if (value.includes("\n")) {
    element.innerHTML = value
      .split("\n")
      .map((line) => escapeHtml(line))
      .join("<br>");
  } else {
    element.textContent = value;
    if (!element.textContent) {
      element.innerHTML = escapeHtml(value);
    }
  }

  element.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    cancelable: true,
    inputType: "insertText",
    data: value,
  }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build HTML-level regex patterns for a given label + format so we can
 * replace the value portion while preserving the separator and formatting.
 */
function buildHtmlPatterns(escapedLabel: string, format: TemplateFormat): RegExp[] {
  switch (format) {
    case "colon":
      return [
        new RegExp(`(${escapedLabel}[\\s]*[*]*:[\\s]*)([^<\\n]*)`, "i"),
      ];
    case "star":
      return [
        new RegExp(`(${escapedLabel}[\\s]*\\*+[\\s]*)([^<\\n]*)`, "i"),
      ];
    case "tab":
      return [
        new RegExp(`(${escapedLabel}[\\s]*\\t[\\s]*)([^<\\n]*)`, "i"),
        new RegExp(`(${escapedLabel}[\\s]+)([^<\\n]*)`, "i"),
      ];
    case "pipe":
      return [
        new RegExp(`(${escapedLabel}[\\s]*\\|[\\s]*)([^<\\n]*)`, "i"),
      ];
    case "arrow":
      return [
        new RegExp(`(${escapedLabel}[\\s]*(?:=>|->)[\\s]*)([^<\\n]*)`, "i"),
      ];
    case "equals":
      return [
        new RegExp(`(${escapedLabel}[\\s]*=[\\s]*)([^<\\n]*)`, "i"),
      ];
    case "dash":
      return [
        new RegExp(`(${escapedLabel}[\\s]+[-–—][\\s]*)([^<\\n]*)`, "i"),
      ];
    case "underscore":
      return [
        new RegExp(`(${escapedLabel}[\\s]*:?[\\s]*)_{2,}`, "i"),
      ];
    case "bare":
      return [
        new RegExp(`(${escapedLabel}[\\s]*)()$`, "im"),
      ];
    default:
      return [
        new RegExp(`(${escapedLabel}[\\s]*[*]*[:\\s]*)([^<\\n]*)`, "i"),
      ];
  }
}

/**
 * For the text-based fallback, find the separator position in a line
 * so we can replace everything after it with the value.
 */
function findSeparatorEnd(line: string, format: TemplateFormat): number {
  switch (format) {
    case "colon": {
      const idx = line.lastIndexOf(":");
      return idx >= 0 ? idx + 1 : -1;
    }
    case "star": {
      const m = line.match(/^(.*\*+)\s*$/);
      return m ? m[1].length : -1;
    }
    case "tab": {
      const idx = line.indexOf("\t");
      return idx >= 0 ? idx + 1 : -1;
    }
    case "pipe": {
      const idx = line.indexOf("|");
      return idx >= 0 ? idx + 1 : -1;
    }
    case "arrow": {
      const m = line.match(/(=>|->)/);
      return m && m.index !== undefined ? m.index + m[1].length : -1;
    }
    case "equals": {
      const idx = line.indexOf("=");
      return idx >= 0 ? idx + 1 : -1;
    }
    case "dash": {
      const m = line.match(/\s+([-–—])\s*/);
      return m && m.index !== undefined ? m.index + m[0].length : -1;
    }
    case "underscore": {
      const m = line.match(/_{2,}/);
      return m && m.index !== undefined ? m.index : -1;
    }
    case "bare":
      return line.length;
    default:
      return -1;
  }
}

/**
 * When a profile value is a multi-line block containing key-value pairs
 * (e.g. "1)Name: ABC\nContact No: 45678\nEmail ID: abc@gmail.com"),
 * extract just the value for a specific field label.
 * Returns the extracted value if found, or the original value if not.
 */
function extractSubValue(value: string, fieldLabel: string): string {
  if (!value.includes("\n")) return value;

  const lines = value.split("\n").map((l) => l.trim()).filter(Boolean);
  // Check if the value contains key-value pairs
  const kvLines = lines.filter((l) => /^(?:\d+\)\s*)?[A-Za-z][A-Za-z\s]*[:|-]\s*.+/.test(l));
  if (kvLines.length < 2) return value; // Not a key-value block

  const normLabel = fieldLabel.toLowerCase().replace(/[^a-z0-9]/g, "");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match "Key: Value" or "Key - Value" patterns, with optional leading "1)"
    const m = line.match(/^(?:\d+\)\s*)?([^:|-]+?)\s*[:|-]\s*(.*)$/);
    if (!m) continue;

    const lineKey = m[1].trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (lineKey === normLabel) {
      // Found the matching key; collect value (may span until next key)
      const parts = [m[2].trim()];
      for (let j = i + 1; j < lines.length; j++) {
        // Stop at next key-value line
        if (/^(?:\d+\)\s*)?[A-Za-z][A-Za-z\s]*[:|-]\s*/.test(lines[j])) break;
        parts.push(lines[j]);
      }
      const extracted = parts.join("\n").trim();
      if (extracted) return extracted;
    }
  }

  return value;
}

/**
 * Convert a multi-line value to HTML with <br> tags, escaping special chars.
 */
function valueToHtml(value: string): string {
  if (value.includes("\n")) {
    return value
      .split("\n")
      .map((line) => escapeHtml(line))
      .join("<br>");
  }
  return escapeHtml(value);
}

/**
 * Fill a template field inside a contenteditable element.
 * Detects the format used by each label and places the value after
 * the separator, preserving the original structure.
 * Supports multi-line values (e.g. references with name, designation, email).
 */
function fillTemplateField(
  element: HTMLElement,
  templateLabel: string,
  value: string,
  format: TemplateFormat = "colon",
): boolean {
  element.focus();

  const html = element.innerHTML;
  const escapedLabel = templateLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const htmlValue = valueToHtml(value);

  // Try format-specific HTML patterns first, then fall back to generic ones
  const formatPatterns = buildHtmlPatterns(escapedLabel, format);
  const genericPatterns = format !== "colon" ? buildHtmlPatterns(escapedLabel, "colon") : [];
  const allPatterns = [...formatPatterns, ...genericPatterns];

  for (const pattern of allPatterns) {
    const match = html.match(pattern);
    if (match) {
      let newHtml: string;
      if (format === "underscore") {
        newHtml = html.replace(pattern, `$1${htmlValue}`);
      } else if (format === "bare") {
        newHtml = html.replace(pattern, `$1 ${htmlValue}`);
      } else {
        newHtml = html.replace(pattern, `$1${htmlValue}`);
      }
      element.innerHTML = newHtml;

      element.dispatchEvent(new InputEvent("input", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: value,
      }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
  }

  // Fallback: line-by-line text replacement
  const text = element.innerText || element.textContent || "";
  const lines = text.split("\n");
  const labelLower = templateLabel.toLowerCase();
  let found = false;

  const newLines: string[] = [];
  for (const line of lines) {
    if (found) {
      newLines.push(line);
      continue;
    }
    const trimmedLower = line.trim().toLowerCase();
    if (!trimmedLower.includes(labelLower)) {
      newLines.push(line);
      continue;
    }

    // Try format-specific separator first
    const sepEnd = findSeparatorEnd(line, format);
    if (sepEnd >= 0) {
      found = true;
      const prefix = line.substring(0, sepEnd);
      newLines.push(prefix + " " + value);
      continue;
    }

    // Generic fallback: try colon, then tab, then append
    const colonIdx = line.lastIndexOf(":");
    if (colonIdx >= 0) {
      found = true;
      newLines.push(line.substring(0, colonIdx + 1) + " " + value);
      continue;
    }
    const tabIdx = line.indexOf("\t");
    if (tabIdx >= 0) {
      found = true;
      newLines.push(line.substring(0, tabIdx + 1) + value);
      continue;
    }
    // Last resort: append after the label
    found = true;
    newLines.push(line + " " + value);
  }

  if (found) {
    // For multi-line values in text mode, use innerHTML with <br> to preserve lines
    if (value.includes("\n")) {
      element.innerHTML = newLines
        .map((line) => escapeHtml(line))
        .join("<br>");
    } else {
      element.innerText = newLines.join("\n");
    }
    element.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      cancelable: true,
      inputType: "insertText",
      data: value,
    }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  return false;
}

/**
 * Fill a table cell (<td>) directly with a value.
 * Supports multi-line values by converting \n to <br>.
 */
function fillTableCell(element: HTMLElement, value: string): void {
  if (value.includes("\n")) {
    element.innerHTML = value
      .split("\n")
      .map((line) => escapeHtml(line))
      .join("<br>");
  } else {
    element.textContent = value;
  }

  element.dispatchEvent(new InputEvent("input", {
    bubbles: true,
    cancelable: true,
    inputType: "insertText",
    data: value,
  }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function fillField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement,
  value: string,
  isContentEditable?: boolean
): void {
  if (isContentEditable || isEditableElement(element)) {
    fillContentEditable(element, value);
    return;
  }

  if (element instanceof HTMLSelectElement) {
    const options = Array.from(element.options);
    const match = options.find(
      (opt) =>
        opt.value.toLowerCase() === value.toLowerCase() ||
        opt.text.toLowerCase() === value.toLowerCase()
    );
    if (match) {
      element.value = match.value;
    }
  } else if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}

// ---------------------------------------------------------------------------
// Message listener
// ---------------------------------------------------------------------------

let lastScannedFields: FormFieldInfo[] = [];

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.action === "GET_FORM_FIELDS") {
      lastScannedFields = scanFormFields();
      const serialized = serializeFormFields(lastScannedFields);
      sendResponse({ action: "FORM_FIELDS_RESULT", data: serialized });
    } else if (message.action === "GET_SELECTION_FIELDS") {
      lastScannedFields = scanSelectionFields();
      const serialized = serializeFormFields(lastScannedFields);
      sendResponse({ action: "FORM_FIELDS_RESULT", data: serialized });
    } else if (message.action === "FILL_FIELDS") {
      const fillData = message.data as Array<{
        index: number;
        value: string;
        isAttachment?: boolean;
        dataUrl?: string;
        fileName?: string;
      }>;
      let filledCount = 0;

      for (const item of fillData) {
        if (item.index >= 0 && item.index < lastScannedFields.length) {
          const field = lastScannedFields[item.index];
          if (item.isAttachment && item.dataUrl && item.fileName) {
            if (field.element instanceof HTMLInputElement) {
              // Standard file input
              if (fillFileInput(field.element, item.dataUrl, item.fileName)) {
                filledCount++;
              }
            } else {
              // Try drag-and-drop on compose area (Gmail/Outlook)
              const composeArea = field.element.closest("[contenteditable='true']") ||
                                  document.querySelector("[role='textbox'][contenteditable='true']") ||
                                  field.element;
              if (dropFileOnElement(composeArea as HTMLElement, item.dataUrl, item.fileName)) {
                filledCount++;
              }
            }
          } else if (field.isTemplateField && field.templateFormat === "table") {
            const cellValue = field.templateLabel
              ? extractSubValue(item.value, field.templateLabel)
              : item.value;
            fillTableCell(field.element, cellValue);
            filledCount++;
          } else if (field.isTemplateField && field.templateLabel) {
            const fieldValue = extractSubValue(item.value, field.templateLabel);
            if (fillTemplateField(field.element, field.templateLabel, fieldValue, field.templateFormat || "colon")) {
              filledCount++;
            }
          } else {
            fillField(field.element, item.value, field.isContentEditable);
            filledCount++;
          }
        }
      }

      sendResponse({ action: "FILL_RESULT", data: { filledCount } });
    }

    return true;
  }
);
