import { redirect } from "next/navigation";
import { adminPage } from "@/routes/index";

export default function Page() {
  redirect(adminPage("/settings/survey"));
}
