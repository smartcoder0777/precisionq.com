import Dashboard from "@/views/Dashboard";
import { getDashboardContactTracks } from "@/server/dashboard-contact-tracks";

export default async function Page() {
  let loadError: string | null = null;
  const initialTracks = await getDashboardContactTracks().catch((err: unknown) => {
    loadError = err instanceof Error ? err.message : "Could not load contact tracks.";
    return [];
  });

  return <Dashboard initialTracks={initialTracks} loadError={loadError} />;
}
