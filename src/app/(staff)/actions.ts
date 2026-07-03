"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function toggleLocale() {
  const store = await cookies();
  const current = store.get("locale")?.value === "es" ? "es" : "en";
  store.set("locale", current === "es" ? "en" : "es", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
}
