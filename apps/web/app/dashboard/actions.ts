"use server";

import { redirect } from "next/navigation";
import { getAuthService } from "@/lib/auth/service";

export async function signOut() {
  await getAuthService().signOut();
  redirect("/auth/login");
}
