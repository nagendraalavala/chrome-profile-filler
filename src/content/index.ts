import { FormFieldInfo, ExtensionMessage } from "../models/profile";

function findLabel(element: HTMLElement): string {
  // Check for associated label via "for" attribute
  const id = element.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label) return label.textContent?.trim() || "";
  }

  // Check parent label
  const parentLabel = element.closest("label");
  if (parentLabel) {
    const clone = parentLabel.cloneNode(true) as HTMLElement;
    const inputs = clone.querySelectorAll("input, select, textarea");
    inputs.forEach((el) => el.remove());
    return clone.textContent?.trim() || "";
  }

  // Check aria-label
  const ariaLabel = element.getAttribute("aria-label");
  if (ariaLabel) return ariaLabel;

  // Check aria-labelledby
  const labelledBy = element.getAttribute("aria-labelledby");
  if (labelledBy) {
    const labelEl = document.getElementById(labelledBy);
    if (labelEl) return labelEl.textContent?.trim() || "";
  }

  // Check preceding sibling text
  const prev = element.previousElementSibling;
  if (prev && (prev.tagName === "LABEL" || prev.tagName === "SPAN")) {
    return prev.textContent?.trim() || "";
  }

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

    // Look for heading elements
    const heading = current.querySelector("h1, h2, h3, h4, h5, h6, legend, [role='heading']");
    if (heading) {
      return heading.textContent?.trim() || "";
    }

    // Look for fieldset legend
    if (current.tagName === "FIELDSET") {
      const legend = current.querySelector("legend");
      if (legend) return legend.textContent?.trim() || "";
    }

    // Look for section/group labels
    const sectionLabel = current.getAttribute("aria-label") || current.getAttribute("data-section");
    if (sectionLabel) return sectionLabel;
  }

  return "";
}

function isVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== "none" &&
    style.visibility !== "hidden" &&
    style.opacity !== "0" &&
    element.offsetParent !== null
  );
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
    });
  });

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
  }));
}

function fillField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): void {
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
  } else {
    element.value = value;
  }

  // Dispatch events to trigger framework change handlers
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
}

// Keep scanned fields in memory so we can fill them later
let lastScannedFields: FormFieldInfo[] = [];

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.action === "GET_FORM_FIELDS") {
      lastScannedFields = scanFormFields();
      const serialized = serializeFormFields(lastScannedFields);
      sendResponse({ action: "FORM_FIELDS_RESULT", data: serialized });
    } else if (message.action === "FILL_FIELDS") {
      const fillData = message.data as Array<{ index: number; value: string }>;
      let filledCount = 0;

      for (const item of fillData) {
        if (item.index >= 0 && item.index < lastScannedFields.length) {
          fillField(lastScannedFields[item.index].element, item.value);
          filledCount++;
        }
      }

      sendResponse({ action: "FILL_RESULT", data: { filledCount } });
    }

    return true; // keep message channel open for async response
  }
);
