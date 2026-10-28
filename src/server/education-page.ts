import "server-only";

import { educationsRowToPage } from "@/lib/education-db-mapper";
import * as EducationModel from "@/models/education.model";
import type { EducationPageRow } from "@/types/education-page";

export type EducationPagePayload = {
  rows: EducationPageRow[];
};

export async function loadEducationPagePayload(): Promise<EducationPagePayload> {
  const dbRows = await EducationModel.getAllEducations();
  return { rows: dbRows.map(educationsRowToPage) };
}
