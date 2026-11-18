import Withdrawals from "@/views/Withdrawals";
import { getAuthSession } from "@/lib/auth-session";
import { canViewAllTickets } from "@/lib/ticket-access";

export default async function Page() {
  const session = await getAuthSession();
  const canReview = session ? await canViewAllTickets(session) : false;
  return <Withdrawals canReview={canReview} />;
}
