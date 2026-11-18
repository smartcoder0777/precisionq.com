import { redirect } from "next/navigation";
import { adminPage } from "@/routes";

/** Managers/admins land on the wallet page which includes the all-wallets table. */
export default function Page() {
  redirect(adminPage("/wallet"));
}
