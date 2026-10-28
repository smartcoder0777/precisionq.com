import CommunityServices from "@/views/CommunityServices";
import { loadCommunityServicesPagePayload } from "@/server/community-services-page";

export default async function Page() {
  const payload = await loadCommunityServicesPagePayload();
  return (
    <CommunityServices
      initialCategories={payload.categories}
      initialServices={payload.services}
      clinics={payload.clinics}
    />
  );
}
