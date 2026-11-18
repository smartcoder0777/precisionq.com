import WalletView from "@/views/Wallet";
import { getAuthSession } from "@/lib/auth-session";
import { canViewAllTickets } from "@/lib/ticket-access";

export default async function Page() {
  const session = await getAuthSession();
  const canManageAll = session ? await canViewAllTickets(session) : false;
  return <WalletView canManageAll={canManageAll} />;
}
