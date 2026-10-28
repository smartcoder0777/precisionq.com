export type LangDocument = {
  path: string;
  displayName: string;
  sizeLabel: string;
};

export type EducationPageRow = {
  id: string;
  pageName: string;
  title: Record<string, string>;
  description: Record<string, string>;
  documents: Partial<Record<string, LangDocument>>;
  /** From `educations.updatedAt` */
  updatedAt: string;
};
