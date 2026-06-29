export interface AutoFillRule {
  id: string;
  keywords: string[];
  value: string;
  enabled: boolean;
  category?: string;
}

export interface ExpiryField {
  fieldId: string;
  label: string;
  expiryDate: string; // ISO date string YYYY-MM-DD
  profileId: string;
  profileName: string;
}
