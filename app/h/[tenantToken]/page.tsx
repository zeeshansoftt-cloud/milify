import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { checklists, departments, tasks, taskCompletions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getTenantByToken } from "@/lib/customer";
import { frequencyLabel, periodKey, type Frequency } from "@/lib/period";

export const dynamic = "force-dynamic";

export default async function TenantHome({
  params,
}: {
  params: Promise<{ tenantToken: string }>;
}) {
  const { tenantToken } = await params;
  const tenant = await getTenantByToken(tenantToken);
  if (!tenant) notFound();

  const user = await getCurrentUser();

  const allChecklists = await db
    .select()
    .from(checklists)
    .where(and(eq(checklists.tenantId, tenant.id), eq(checklists.isArchived, false)))
    .orderBy(asc(checklists.sortIndex));

  const visibleChecklists =
    user && user.role === "staff" && user.departmentId
      ? allChecklists.filter((c) => !c.departmentId || c.departmentId === user.departmentId)
      : allChecklists;

  const deptIds = Array.from(
    new Set(visibleChecklists.map((c) => c.departmentId).filter((x): x is string => !!x))
  );
  const deptRows = deptIds.length
    ? await db.select().from(departments).where(inArray(departments.id, deptIds))
    : [];
  const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));

  const checklistIds = visibleChecklists.map((c) => c.id);
  const allTasks = checklistIds.length
    ? await db
        .select()
        .from(tasks)
        .where(and(inArray(tasks.checklistId, checklistIds), eq(tasks.isArchived, false)))
    : [];
  const tasksByChecklist = new Map<string, typeof allTasks>();
  for (const t of allTasks) {
    const list = tasksByChecklist.get(t.checklistId) ?? [];
    list.push(t);
    tasksByChecklist.set(t.checklistId, list);
  }

  const taskIds = allTasks.map((t) => t.id);
  const allCompletions = taskIds.length
    ? await db
        .select()
        .from(taskCompletions)
        .where(inArray(taskCompletions.taskId, taskIds))
    : [];

  return (
    <div>
      <div className="mb-8">
        <p className="kicker mb-2">Rutiner</p>
        <h1 className="text-h1 font-display">{tenant.name}</h1>
        <p className="mt-2 text-body text-ink-70">
          Öppna en checklista för att bocka av dagens rutiner. QR-koder går direkt hit.
        </p>
      </div>

      {visibleChecklists.length === 0 ? (
        <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
          Inga checklistor upplagda än. Be er administratör lägga upp dem.
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visibleChecklists.map((c) => {
            const freq = c.frequency as Frequency;
            const pk = periodKey(freq);
            const list = tasksByChecklist.get(c.id) ?? [];
            const taskIdSet = new Set(list.map((t) => t.id));
            const doneThisPeriod = new Set(
              allCompletions
                .filter((x) => taskIdSet.has(x.taskId) && x.periodKey === pk)
                .map((x) => x.taskId)
            );
            const total = list.length;
            const done = doneThisPeriod.size;
            const remaining = total - done;
            const dept = c.departmentId ? deptMap.get(c.departmentId) : null;

            return (
              <li key={c.id}>
                <Link
                  href={`/c/${c.token}`}
                  className="group block bg-white rounded p-5 md:p-6 border border-rule hover:border-ink/20 transition-colors h-full"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${
                            remaining > 0 ? "bg-alert" : "bg-accent"
                          }`}
                          aria-hidden="true"
                        />
                        <h2 className="font-display text-h2">{c.title}</h2>
                      </div>
                      <p className="mt-1.5 text-small text-ink-70 line-clamp-2">
                        {c.description || frequencyLabel(freq)}
                      </p>
                      <p className="mt-3 text-caption uppercase tracking-[0.14em] text-ink-40">
                        {frequencyLabel(freq)} · {done}/{total} klara
                        {dept ? ` · ${dept}` : ""}
                      </p>
                    </div>
                    <div className="pt-1 text-small text-ink-70 group-hover:text-ink transition-colors whitespace-nowrap">
                      Öppna →
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
