"use server";

import { db } from "@/db/client";
import {
  checklists,
  departments,
  parentLinks,
  tasks,
  tenants,
  users,
} from "@/db/schema";
import { and, asc, eq, max, ne } from "drizzle-orm";
import { createId, createToken } from "@/lib/tokens";
import { requireAdmin, hashPassword } from "@/lib/auth";
import { starterChecklists } from "@/db/seed";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FREQUENCIES = ["daily", "weekly", "monthly", "custom"] as const;
type Frequency = (typeof FREQUENCIES)[number];
function asFrequency(v: unknown): Frequency {
  const s = String(v ?? "");
  return (FREQUENCIES as readonly string[]).includes(s) ? (s as Frequency) : "daily";
}

// ---------- TENANTS ----------

export async function createTenant(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  const locale = String(formData.get("locale") ?? "sv") === "en" ? "en" : "sv";
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!name) return;

  const id = createId();
  await db.insert(tenants).values({
    id,
    name,
    token: createToken(),
    locale,
    note: note || null,
    isActive: true,
  });

  // Starter checklists + tasks
  for (const [i, c] of starterChecklists.entries()) {
    const cid = createId();
    await db.insert(checklists).values({
      id: cid,
      tenantId: id,
      departmentId: null,
      title: c.title,
      description: "",
      frequency: c.frequency,
      token: createToken(),
      isArchived: false,
      sortIndex: i,
    });
    if (c.tasks.length) {
      await db.insert(tasks).values(
        c.tasks.map((title, idx) => ({
          id: createId(),
          checklistId: cid,
          title,
          assignedUserId: null,
          sortIndex: idx,
          isArchived: false,
        }))
      );
    }
  }

  revalidatePath("/admin/tenants");
  redirect(`/admin/tenants/${id}`);
}

export async function updateTenant(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  const locale = String(formData.get("locale") ?? "sv") === "en" ? "en" : "sv";
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (!id || !name) return;
  await db
    .update(tenants)
    .set({ name, locale, note: note || null })
    .where(eq(tenants.id, id));
  revalidatePath(`/admin/tenants/${id}`);
}

export async function toggleTenantActive(id: string): Promise<void> {
  await requireAdmin();
  const [row] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!row) return;
  await db.update(tenants).set({ isActive: !row.isActive }).where(eq(tenants.id, id));
  revalidatePath("/admin/tenants");
}

// ---------- DEPARTMENTS ----------

export async function createDepartment(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!tenantId || !name) return;
  const m = await db
    .select({ m: max(departments.sortIndex) })
    .from(departments)
    .where(eq(departments.tenantId, tenantId));
  await db.insert(departments).values({
    id: createId(),
    tenantId,
    name,
    sortIndex: (m[0]?.m ?? -1) + 1,
  });
  revalidatePath(`/admin/tenants/${tenantId}/departments`);
}

export async function renameDepartment(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  if (!id || !name) return;
  await db.update(departments).set({ name }).where(eq(departments.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/departments`);
}

export async function deleteDepartment(tenantId: string, id: string): Promise<void> {
  await requireAdmin();
  await db.delete(departments).where(eq(departments.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/departments`);
}

// ---------- USERS ----------

export async function createTenantUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "staff") === "admin" ? "admin" : "staff";
  const deptRaw = String(formData.get("departmentId") ?? "").trim();
  if (!tenantId || !email || !password || password.length < 6) return;

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return;

  await db.insert(users).values({
    id: createId(),
    tenantId: role === "admin" && !tenantId ? null : tenantId,
    departmentId: deptRaw || null,
    role,
    email,
    passwordHash: await hashPassword(password),
    name,
    isActive: true,
  });
  revalidatePath(`/admin/tenants/${tenantId}/users`);
}

export async function updateTenantUser(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const role = String(formData.get("role") ?? "staff") === "admin" ? "admin" : "staff";
  const deptRaw = String(formData.get("departmentId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!id) return;
  const patch: Record<string, unknown> = {
    name,
    role,
    departmentId: deptRaw || null,
  };
  if (password && password.length >= 6) {
    patch.passwordHash = await hashPassword(password);
  }
  await db.update(users).set(patch).where(eq(users.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/users`);
}

export async function toggleUserActive(tenantId: string, id: string): Promise<void> {
  await requireAdmin();
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!row) return;
  await db.update(users).set({ isActive: !row.isActive }).where(eq(users.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/users`);
}

export async function deleteTenantUser(tenantId: string, id: string): Promise<void> {
  await requireAdmin();
  // Never allow deletion of the last active admin (prevents lockout).
  const activeAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "admin"), eq(users.isActive, true), ne(users.id, id)));
  if (activeAdmins.length === 0) return;
  await db.delete(users).where(eq(users.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/users`);
}

// ---------- CHECKLISTS ----------

export async function createChecklist(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);
  const frequency = asFrequency(formData.get("frequency"));
  const deptRaw = String(formData.get("departmentId") ?? "").trim();
  if (!tenantId || !title) return;

  const m = await db
    .select({ m: max(checklists.sortIndex) })
    .from(checklists)
    .where(eq(checklists.tenantId, tenantId));

  const id = createId();
  await db.insert(checklists).values({
    id,
    tenantId,
    departmentId: deptRaw || null,
    title,
    description,
    frequency,
    token: createToken(),
    isArchived: false,
    sortIndex: (m[0]?.m ?? -1) + 1,
  });

  revalidatePath(`/admin/tenants/${tenantId}/checklists`);
  redirect(`/admin/tenants/${tenantId}/checklists/${id}`);
}

export async function updateChecklist(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 160);
  const description = String(formData.get("description") ?? "").trim().slice(0, 500);
  const frequency = asFrequency(formData.get("frequency"));
  const deptRaw = String(formData.get("departmentId") ?? "").trim();
  if (!id || !title) return;
  await db
    .update(checklists)
    .set({ title, description, frequency, departmentId: deptRaw || null })
    .where(eq(checklists.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/checklists/${id}`);
  revalidatePath(`/admin/tenants/${tenantId}/checklists`);
}

export async function toggleChecklistArchived(tenantId: string, id: string): Promise<void> {
  await requireAdmin();
  const [row] = await db.select().from(checklists).where(eq(checklists.id, id)).limit(1);
  if (!row) return;
  await db.update(checklists).set({ isArchived: !row.isArchived }).where(eq(checklists.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/checklists`);
}

// ---------- TASKS ----------

export async function createTask(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const checklistId = String(formData.get("checklistId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const assignedUserId = String(formData.get("assignedUserId") ?? "").trim() || null;
  if (!checklistId || !title) return;

  const m = await db
    .select({ m: max(tasks.sortIndex) })
    .from(tasks)
    .where(eq(tasks.checklistId, checklistId));

  await db.insert(tasks).values({
    id: createId(),
    checklistId,
    title,
    assignedUserId,
    sortIndex: (m[0]?.m ?? -1) + 1,
    isArchived: false,
  });

  revalidatePath(`/admin/tenants/${tenantId}/checklists/${checklistId}`);
}

export async function updateTask(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const checklistId = String(formData.get("checklistId") ?? "");
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const assignedUserId = String(formData.get("assignedUserId") ?? "").trim() || null;
  if (!id || !title) return;
  await db
    .update(tasks)
    .set({ title, assignedUserId })
    .where(eq(tasks.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/checklists/${checklistId}`);
}

export async function archiveTask(tenantId: string, checklistId: string, id: string): Promise<void> {
  await requireAdmin();
  await db.update(tasks).set({ isArchived: true }).where(eq(tasks.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/checklists/${checklistId}`);
}

export async function moveTask(
  tenantId: string,
  checklistId: string,
  id: string,
  direction: "up" | "down"
): Promise<void> {
  await requireAdmin();
  const siblings = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.checklistId, checklistId), eq(tasks.isArchived, false)))
    .orderBy(asc(tasks.sortIndex));
  const i = siblings.findIndex((s) => s.id === id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= siblings.length) return;
  const a = siblings[i];
  const b = siblings[j];
  await db.update(tasks).set({ sortIndex: b.sortIndex }).where(eq(tasks.id, a.id));
  await db.update(tasks).set({ sortIndex: a.sortIndex }).where(eq(tasks.id, b.id));
  revalidatePath(`/admin/tenants/${tenantId}/checklists/${checklistId}`);
}

// ---------- PARENT LINKS ----------

export async function createParentLink(formData: FormData): Promise<void> {
  await requireAdmin();
  const tenantId = String(formData.get("tenantId") ?? "");
  const label = String(formData.get("label") ?? "").trim().slice(0, 120);
  const deptRaw = String(formData.get("departmentId") ?? "").trim();
  const language = String(formData.get("language") ?? "sv").trim().slice(0, 10) || "sv";
  if (!tenantId) return;
  await db.insert(parentLinks).values({
    id: createId(),
    tenantId,
    departmentId: deptRaw || null,
    token: createToken(),
    language,
    label,
    isActive: true,
  });
  revalidatePath(`/admin/tenants/${tenantId}/parents`);
}

export async function toggleParentLinkActive(tenantId: string, id: string): Promise<void> {
  await requireAdmin();
  const [row] = await db.select().from(parentLinks).where(eq(parentLinks.id, id)).limit(1);
  if (!row) return;
  await db.update(parentLinks).set({ isActive: !row.isActive }).where(eq(parentLinks.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/parents`);
}

export async function deleteParentLink(tenantId: string, id: string): Promise<void> {
  await requireAdmin();
  await db.delete(parentLinks).where(eq(parentLinks.id, id));
  revalidatePath(`/admin/tenants/${tenantId}/parents`);
}
