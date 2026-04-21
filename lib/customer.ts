import "server-only";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cache } from "react";

export const getTenantByToken = cache(async (token: string) => {
  const rows = await db.select().from(tenants).where(eq(tenants.token, token)).limit(1);
  const row = rows[0];
  if (!row || !row.isActive) return null;
  return row;
});
