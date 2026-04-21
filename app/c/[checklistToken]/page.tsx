import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq, inArray, and, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { checklists, tasks, taskCompletions, tenants, users, departments } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { periodKey, periodLabel, frequencyLabel, type Frequency } from "@/lib/period";
import { ChecklistTaskRow } from "./components/ChecklistTaskRow";

export const dynamic = "force-dynamic";

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ checklistToken: string }>;
}) {
  const { checklistToken } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/c/${checklistToken}`);

  const rows = await db
    .select()
    .from(checklists)
    .where(eq(checklists.token, checklistToken))
    .limit(1);
  const checklist = rows[0];
  if (!checklist || checklist.isArchived) notFound();

  if (user.role !== "admin" && user.tenantId !== checklist.tenantId) {
    redirect("/login?error=forbidden");
  }

  const [tenantRow] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, checklist.tenantId))
    .limit(1);
  if (!tenantRow) notFound();

  const deptRow = checklist.departmentId
    ? (await db.select().from(departments).where(eq(departments.id, checklist.departmentId)).limit(1))[0]
    : null;

  const taskRows = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.checklistId, checklist.id), eq(tasks.isArchived, false)))
    .orderBy(asc(tasks.sortIndex));

  const pk = periodKey(checklist.frequency as Frequency);
  const now = new Date();

  const completions = taskRows.length
    ? await db
        .select()
        .from(taskCompletions)
        .where(
          and(
            inArray(
              taskCompletions.taskId,
              taskRows.map((t) => t.id)
            ),
            eq(taskCompletions.periodKey, pk)
          )
        )
        .orderBy(desc(taskCompletions.completedAt))
    : [];

  const latestByTask = new Map<string, (typeof completions)[number]>();
  for (const c of completions) {
    if (!latestByTask.has(c.taskId)) latestByTask.set(c.taskId, c);
  }

  const assignedIds = Array.from(
    new Set(taskRows.map((t) => t.assignedUserId).filter((id): id is string => !!id))
  );
  const assignedUsers = assignedIds.length
    ? await db.select().from(users).where(inArray(users.id, assignedIds))
    : [];
  const assignedMap = new Map(assignedUsers.map((u) => [u.id, u.name || u.email]));

  const doneCount = latestByTask.size;
  const total = taskRows.length;

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md border-b border-rule">
        <div className="container max-w-[720px] flex items-center justify-between h-14">
          <Link
            href={`/h/${tenantRow.token}`}
            className="flex items-center gap-2 text-small text-ink-70 hover:text-ink"
          >
            ← {tenantRow.name}
          </Link>
          <div className="text-caption uppercase tracking-[0.14em] text-ink-40 truncate max-w-[50%] text-right">
            {user.name || user.email}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="container max-w-[720px] py-6 md:py-10">
          <div className="mb-6">
            <p className="kicker mb-2">
              {frequencyLabel(checklist.frequency as Frequency)} ·{" "}
              {periodLabel(checklist.frequency as Frequency, now)}
              {deptRow ? ` · ${deptRow.name}` : ""}
            </p>
            <h1 className="text-h1 font-display">{checklist.title}</h1>
            {checklist.description && (
              <p className="mt-2 text-body text-ink-70">{checklist.description}</p>
            )}
            <p className="mt-4 text-small text-ink-70">
              {doneCount}/{total} klara denna period
            </p>
          </div>

          {taskRows.length === 0 ? (
            <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
              Inga uppgifter ännu.
            </div>
          ) : (
            <ul className="space-y-3">
              {taskRows.map((t) => {
                const done = latestByTask.get(t.id) ?? null;
                return (
                  <ChecklistTaskRow
                    key={t.id}
                    checklistToken={checklistToken}
                    task={{
                      id: t.id,
                      title: t.title,
                      assigneeLabel: t.assignedUserId ? assignedMap.get(t.assignedUserId) ?? "" : "",
                    }}
                    completion={
                      done
                        ? {
                            byName: done.userName,
                            at: done.completedAt,
                            note: done.note ?? "",
                            mine: done.userId === user.id,
                          }
                        : null
                    }
                  />
                );
              })}
            </ul>
          )}
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="container max-w-[720px] py-6 text-caption text-ink-70 flex justify-between">
          <span>Milify · {tenantRow.name}</span>
          <form action="/api/admin/logout" method="post">
            <button type="submit" className="hover:text-ink">
              Logga ut
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
