"use server";

import { db } from "@/db/client";
import { parentLinks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supportedParentLangs } from "./langs";

export async function setParentLanguage(token: string, formData: FormData): Promise<void> {
  const lang = String(formData.get("lang") ?? "").trim().toLowerCase();
  if (!supportedParentLangs.includes(lang)) return;
  await db.update(parentLinks).set({ language: lang }).where(eq(parentLinks.token, token));
  revalidatePath(`/p/${token}`);
  redirect(`/p/${token}`);
}
