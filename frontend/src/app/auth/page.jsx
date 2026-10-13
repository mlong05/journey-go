import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

export default function AuthRedirectPage() {
  redirect(ROUTES.LOGIN || "/login");
}
