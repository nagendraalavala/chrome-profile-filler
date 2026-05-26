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
// Template scanning: detect "Label:" patterns in contenteditable text
// (e.g. Gmail replies with "Full Name:", "Current Location:", etc.)
// ---------------------------------------------------------------------------

// Pattern 1: Line ends with colon, optionally preceded by stars (e.g. "Full Name:", "LinkedIn***:")
const TEMPLATE_COLON_PATTERN = /^(.+?)\s*[*]*:\s*$/;
// Pattern 2: Line ends with asterisk(s) only, no colon (e.g. "Visa Status*", "PP Number*")
const TEMPLATE_STAR_PATTERN = /^([A-Za-z].+?)\s*\*+\s*$/;

function extractTemplateLabels(element: HTMLElement): string[] {
  const text = element.innerText || element.textContent || "";
  const lines = text.split("\n");
  const labels: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip lines that are too long (likely paragraph text, not labels)
    if (trimmed.length > 80) continue;
    // Skip lines that look like email signatures or URLs
    if (trimmed.startsWith("http") || trimmed.startsWith("www.")) continue;
    if (trimmed.includes("@") && !trimmed.endsWith(":")) continue;

    let match = trimmed.match(TEMPLATE_COLON_PATTERN);
    if (match) {
      const label = match[1].trim();
      // Ensure the label starts with a letter and has meaningful content
      if (label.length >= 2 && /^[A-Za-z]/.test(label)) {
        labels.push(label);
      }
      continue;
    }

    match = trimmed.match(TEMPLATE_STAR_PATTERN);
    if (match) {
      const label = match[1].trim();
      if (label.length >= 2) {
        labels.push(label);
      }
    }
  }
  return labels;
}

function scanTemplateFields(element: HTMLElement): FormFieldInfo[] {
  const labels = extractTemplateLabels(element);
  if (labels.length < 2) return []; // Need at least 2 labels to be a template

  return labels.map((label) => ({
    element,
    name: label.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase(),
    id: "",
    label,
    type: "template-field",
    placeholder: "",
    sectionHeading: "",
    autocomplete: "",
    isContentEditable: true,
    isTemplateField: true,
    templateLabel: label,
  }));
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

  // Scan same-origin iframes for fields and editors
  const iframeFields = scanIframeFields();
  fields.push(...iframeFields);

  // Scan file input fields for attachment support
  const fileFields = scanFileInputs();
  fields.push(...fileFields);

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
  element.textContent = value;

  if (!element.textContent) {
    element.innerHTML = value;
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

/**
 * Fill a template field inside a contenteditable element.
 * Finds the line with "Label:" or "Label*" and appends the value after it.
 */
function fillTemplateField(element: HTMLElement, templateLabel: string, value: string): boolean {
  element.focus();

  // Work with innerHTML to preserve formatting
  const html = element.innerHTML;
  // Escape the label for use in regex
  const escapedLabel = templateLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Try multiple patterns to find the label in HTML:
  // 1. Label followed by optional stars then colon: "Full Name:", "LinkedIn***:"
  // 2. Label followed by stars only: "Visa Status*", "PP Number*"
  const patterns = [
    new RegExp(`(${escapedLabel}[\\s]*[*]*[:\\s]*)([^<\\n]*)`, "i"),
    new RegExp(`(${escapedLabel}[\\s]*\\*+[\\s]*)([^<\\n]*)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const newHtml = html.replace(pattern, `$1${value}`);
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

  // Fallback: try with textContent line-by-line
  const text = element.innerText || element.textContent || "";
  const lines = text.split("\n");
  const labelLower = templateLabel.toLowerCase();
  let found = false;

  const newLines = lines.map((line) => {
    if (found) return line;
    const trimmed = line.trim().toLowerCase();
    // Check if this line contains the label
    if (trimmed.includes(labelLower)) {
      // Find the last colon or the last sequence of stars
      const lastColonIdx = line.lastIndexOf(":");
      if (lastColonIdx >= 0) {
        found = true;
        return line.substring(0, lastColonIdx + 1) + " " + value;
      }
      // Find trailing stars
      const starMatch = line.match(/^(.*\*+)\s*$/);
      if (starMatch) {
        found = true;
        return starMatch[1] + " " + value;
      }
    }
    return line;
  });

  if (found) {
    element.innerText = newLines.join("\n");
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
            let attached = false;

            if (field.element instanceof HTMLInputElement && field.element.type === "file") {
              // Standard file input — set .files directly
              attached = fillFileInput(field.element, item.dataUrl, item.fileName);
            }

            if (!attached) {
              // Find ANY visible file input in the compose dialog
              const composeDialog = field.element.closest("[role='dialog']") ||
                                    field.element.closest(".compose") ||
                                    document.querySelector("[role='dialog']");
              if (composeDialog) {
                const hiddenInputs = composeDialog.querySelectorAll<HTMLInputElement>("input[type='file']");
                for (const fileInput of hiddenInputs) {
                  if (fillFileInput(fileInput, item.dataUrl, item.fileName)) {
                    attached = true;
                    break;
                  }
                }
              }
            }

            if (!attached) {
              // Download the file so user can manually attach it
              // This is the reliable fallback for Gmail/Outlook where
              // programmatic attachment is blocked by browser security
              try {
                chrome.runtime.sendMessage({
                  action: "DOWNLOAD_ATTACHMENT",
                  data: { dataUrl: item.dataUrl, fileName: item.fileName },
                });
                attached = true;
              } catch {
                // If download fails, try drag-and-drop as last resort
                const composeArea = field.element.closest("[contenteditable='true']") ||
                                    document.querySelector("[role='textbox'][contenteditable='true']") ||
                                    field.element;
                attached = dropFileOnElement(composeArea as HTMLElement, item.dataUrl, item.fileName);
              }
            }

            if (attached) {
              filledCount++;
            }
          } else if (field.isTemplateField && field.templateLabel) {
            if (fillTemplateField(field.element, field.templateLabel, item.value)) {
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
