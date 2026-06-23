export type FieldType = "FIELD" | "GROUP" | "ATTACHMENT";

export interface ProfileField {
  id: string;
  key: string;
  label: string;
  value?: string;
  type: FieldType;
  children?: ProfileField[];
  collapsed?: boolean;
  attachment?: DocumentInfo;
}

export interface DocumentInfo {
  fileName: string;
  mimeType: string;
  size: number;
  dataUrl: string; // base64-encoded data URL
}

export interface Profile {
  profileId: string;
  name: string;
  fields: ProfileField[];
}

export interface FlattenedField {
  dotKey: string;
  value: string;
  label: string;
  isAttachment?: boolean;
  attachment?: DocumentInfo;
}

export interface SiteMapping {
  domain: string;
  fieldSignature: string;
  profileKey: string;
}

export interface MatchResult {
  formFieldName: string;
  formFieldLabel: string;
  formFieldElement: string;
  profileKey: string;
  value: string;
  confidence: number;
  selected: boolean;
  group?: string;
  isAttachment?: boolean;
  attachment?: DocumentInfo;
}

export interface FormFieldInfo {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLElement;
  name: string;
  id: string;
  label: string;
  type: string;
  placeholder: string;
  sectionHeading: string;
  autocomplete: string;
  isContentEditable?: boolean;
  isFileInput?: boolean;
  acceptTypes?: string;
  isTemplateField?: boolean;
  templateLabel?: string;
  templateFormat?: "colon" | "star" | "tab" | "dash" | "pipe" | "arrow" | "equals" | "underscore" | "bare" | "table";
}

export type MessageAction =
  | "SCAN_FORM"
  | "FILL_FIELDS"
  | "GET_FORM_FIELDS"
  | "GET_SELECTION_FIELDS"
  | "SCAN_RESULT"
  | "FILL_RESULT"
  | "FORM_FIELDS_RESULT"
  | "PING"
  | "PONG"
  | "CONTEXT_MENU_FILL"
  | "CONTEXT_FILL_RESULT"
  | "OPEN_POPUP_AND_SCAN"
  | "DOWNLOAD_ATTACHMENT";

export interface ExtensionMessage {
  action: MessageAction;
  data?: unknown;
}
