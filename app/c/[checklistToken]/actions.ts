"use server";

import { db } from "@/db/client";
import { checklists, tasks, taskCompletions, tenants } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createId } from "@/lib/tokens";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";
import { periodKey, type Frequency } from "@/lib/period";

async function loadChecklist(token: string) {
  const rows = await db.select().from(checklists).where(eq(checklists.token, token)).limit(1);
  return rows[0];
}

async function tenantTokenFor(tenantId: string): Promise<string | null> {
  const rows = await db
    .select({ token: tenants.token })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  return rows[0]?.token ?? null;
}

async function checkRate(token: string) {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`c:${token}:${ip}`, 240, 60_000)) throw new Error("rate_limited");
}

export async function markTaskDone(
  checklistToken: string,
  taskId: string,
  note?: string
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthenticated");
  await checkRate(checklistToken);

  const checklist = await loadChecklist(checklistToken);
  if (!checklist || checklist.isArchived) throw new Error("not_found");
  if (user.role !== "admin" && user.tenantId !== checklist.tenantId) throw new Error("forbidden");

  const taskRows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.checklistId, checklist.id)))
    .limit(1);
  const task = taskRows[0];
  if (!task || task.isArchived) throw new Error("not_found");

  const pk = periodKey(checklist.frequency as Frequency);

  const existing = await db
    .select()
    .from(taskCompletions)
    .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.periodKey, pk)))
    .orderBy(desc(taskCompletions.completedAt))
    .limit(1);

  if (existing[0]) {
    if (note !== undefined) {
      await db
        .update(taskCompletions)
        .set({ note: note.slice(0, 2000) })
        .where(eq(taskCompletions.id, existing[0].id));
    }
  } else {
    await db.insert(taskCompletions).values({
      id: createId(),
      taskId,
      userId: user.id,
      userName: user.name || user.email,
      periodKey: pk,
      note: (note ?? "").slice(0, 2000),
    });
  }

  revalidatePath(`/c/${checklistToken}`);
  const tToken = await tenantTokenFor(checklist.tenantId);
  if (tToken) {
    revalidatePath(`/h/${tToken}`);
    revalidatePath(`/h/${tToken}/followup`);
  }
}

export async function undoTaskDone(
  checklistToken: string,
  taskId: string
): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("unauthenticated");
  await checkRate(checklistToken);

  const checklist = await loadChecklist(checklistToken);
  if (!checklist) throw new Error("not_found");
  if (user.role !== "admin" && user.tenantId !== checklist.tenantId) throw new Error("forbidden");

  const pk = periodKey(checklist.frequency as Frequency);

  const existing = await db
    .select()
    .from(taskCompletions)
    .where(and(eq(taskCompletions.taskId, taskId), eq(taskCompletions.periodKey, pk)))
    .orderBy(desc(taskCompletions.completedAt))
    .limit(1);
  const row = existing[0];
  if (!row) return;
  if (user.role !== "admin" && row.userId !== user.id) throw new Error("forbidden");

  await db.delete(taskCompletions).where(eq(taskCompletions.id, row.id));
  revalidatePath(`/c/${checklistToken}`);
}
