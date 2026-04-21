"use server";

import { db } from "@/db/client";
import { messages, messageTranslations, tenants } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createId } from "@/lib/tokens";

export async function createMessage(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthenticated");

  const tenantToken = String(formData.get("tenantToken") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const body = String(formData.get("body") ?? "").trim().slice(0, 4000);
  const departmentId = String(formData.get("departmentId") ?? "").trim();
  const sourceLang = String(formData.get("sourceLang") ?? "sv").trim().slice(0, 10);
  if (!title || !body || !tenantToken) return;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.token, tenantToken)).limit(1);
  if (!tenant) return;
  if (user.role !== "admin" && user.tenantId !== tenant.id) throw new Error("forbidden");

  await db.insert(messages).values({
    id: createId(),
    tenantId: tenant.id,
    authorId: user.id,
    authorName: user.name || user.email,
    departmentId: departmentId || null,
    title,
    body,
    sourceLang: sourceLang || "sv",
  });

  revalidatePath(`/h/${tenantToken}/messages`);
}

export async function deleteMessage(tenantToken: string, messageId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthenticated");

  const [tenant] = await db.select().from(tenants).where(eq(tenants.token, tenantToken)).limit(1);
  if (!tenant) return;
  if (user.role !== "admin" && user.tenantId !== tenant.id) throw new Error("forbidden");

  await db
    .delete(messages)
    .where(and(eq(messages.id, messageId), eq(messages.tenantId, tenant.id)));
  await db.delete(messageTranslations).where(eq(messageTranslations.messageId, messageId));

  revalidatePath(`/h/${tenantToken}/messages`);
}
