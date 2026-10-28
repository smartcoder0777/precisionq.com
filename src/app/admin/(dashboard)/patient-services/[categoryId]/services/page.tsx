import { notFound } from "next/navigation";
import PatientCategoryServices from "@/views/PatientCategoryServices";
import { loadPatientCategoryServicesPage } from "@/server/patient-category-services-page";

type Props = {
  params: Promise<{ categoryId: string }>;
};

export default async function Page({ params }: Props) {
  const { categoryId: raw } = await params;
  const categoryId = Number(raw);
  if (!Number.isFinite(categoryId) || categoryId <= 0) notFound();
  const payload = await loadPatientCategoryServicesPage(categoryId);
  if (!payload) notFound();
  return <PatientCategoryServices {...payload} />;
}
