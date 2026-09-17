
export type DocumentCategory = "founding" | "license" | "insurance" | "financial" | "other";

export interface OrgDocument {
  id: number;
  title: string;
  category: DocumentCategory;
  file: string;
  uploaded_at: string;
}

export interface DocumentTemplate {
  id: number;
  title: string;
  description?: string;
  file: string;
  uploaded_at: string;
}