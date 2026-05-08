export type FieldType = "FIELD" | "GROUP";

export interface ProfileField {
  id: string;
  key: string;
  label: string;
  value?: string;
  type: FieldType;
  children?: ProfileField[];
  collapsed?: boolean;
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
}

export interface FormFieldInfo {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  name: string;
  id: string;
  label: string;
  type: string;
  placeholder: string;
  sectionHeading: string;
  autocomplete: string;
}

export type MessageAction =
  | "SCAN_FORM"
  | "FILL_FIELDS"
  | "GET_FORM_FIELDS"
  | "SCAN_RESULT"
  | "FILL_RESULT"
  | "FORM_FIELDS_RESULT";

export interface ExtensionMessage {
  action: MessageAction;
  data?: unknown;
}
