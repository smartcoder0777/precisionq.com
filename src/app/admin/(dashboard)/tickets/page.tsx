import Tickets from "@/views/Tickets";
import { getTicketsPagePayload } from "@/server/tickets-page";

export default async function Page() {
  let loadError: string | null = null;
  const payload = await getTicketsPagePayload().catch((err: unknown) => {
    loadError = err instanceof Error ? err.message : "Could not load tickets.";
    return { tickets: [], clinics: [], users: [] };
  });

  return (
    <Tickets
      initialTickets={payload.tickets}
      clinics={payload.clinics}
      users={payload.users}
      loadError={loadError}
    />
  );
}
