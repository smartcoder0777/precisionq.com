import Education from "@/views/Education";
import { loadEducationPagePayload } from "@/server/education-page";

export default async function Page() {
  const payload = await loadEducationPagePayload();
  return <Education initialRows={payload.rows} />;
}
