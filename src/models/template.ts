export interface ResponseTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export const DEFAULT_CATEGORIES = [
  "General",
  "Job Application",
  "Customer Support",
  "Cover Letter",
  "Follow Up",
  "Introduction",
];
