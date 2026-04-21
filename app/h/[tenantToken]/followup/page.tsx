import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { checklists, departments, tasks, taskCompletions, users } from "@/db/schema";
import { getTenantByToken } from "@/lib/customer";
import { periodKey, frequencyLabel, type Frequency } from "@/lib/period";

export const dynamic = "force-dynamic";

type Tab = "open" | "overdue" | "history";

export default async function FollowupPage({
  params,
  searchParams,
}: {
  params: Promise<{ tenantToken: string }>;
  searchParams: Promise<{ tab?: string; dept?: string; user?: string }>;
}) {
  const { tenantToken } = await params;
  const { tab: tabRaw, dept: deptFilter, user: userFilter } = await searchParams;
  const tab: Tab = tabRaw === "overdue" ? "overdue" : tabRaw === "history" ? "history" : "open";

  const tenant = await getTenantByToken(tenantToken);
  if (!tenant) notFound();

  const [deptRows, staffRows, checklistRows] = await Promise.all([
    db.select().from(departments).where(eq(departments.tenantId, tenant.id)).orderBy(asc(departments.sortIndex)),
    db.select().from(users).where(eq(users.tenantId, tenant.id)).orderBy(asc(users.name)),
    db
      .select()
      .from(checklists)
      .where(and(eq(checklists.tenantId, tenant.id), eq(checklists.isArchived, false)))
      .orderBy(asc(checklists.sortIndex)),
  ]);

  const filteredChecklists = deptFilter
    ? checklistRows.filter((c) => c.departmentId === deptFilter)
    : checklistRows;

  const taskRows = filteredChecklists.length
    ? await db
        .select()
        .from(tasks)
        .where(
          and(
            inArray(
              tasks.checklistId,
              filteredChecklists.map((c) => c.id)
            ),
            eq(tasks.isArchived, false)
          )
        )
        .orderBy(asc(tasks.sortIndex))
    : [];

  const filteredTasks = userFilter ? taskRows.filter((t) => t.assignedUserId === userFilter) : taskRows;

  const tasksByChecklist = new Map<string, typeof filteredTasks>();
  for (const t of filteredTasks) {
    const list = tasksByChecklist.get(t.checklistId) ?? [];
    list.push(t);
    tasksByChecklist.set(t.checklistId, list);
  }

  const taskIds = filteredTasks.map((t) => t.id);
  const completionsAll = taskIds.length
    ? await db
        .select()
        .from(taskCompletions)
        .where(inArray(taskCompletions.taskId, taskIds))
        .orderBy(desc(taskCompletions.completedAt))
    : [];

  const userMap = new Map(staffRows.map((u) => [u.id, u.name || u.email]));
  const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));

  let totalOpen = 0;
  let totalDone = 0;
  let totalOverdue = 0;

  const now = new Date();
  const previous = (freq: Frequency) => {
    const d = new Date(now);
    if (freq === "daily") d.setDate(d.getDate() - 1);
    else if (freq === "weekly") d.setDate(d.getDate() - 7);
    else if (freq === "monthly") d.setMonth(d.getMonth() - 1);
    return d;
  };

  const grouped = filteredChecklists.map((c) => {
    const freq = c.frequency as Frequency;
    const pk = periodKey(freq, now);
    const prevPk = freq === "custom" ? null : periodKey(freq, previous(freq));
    const list = tasksByChecklist.get(c.id) ?? [];

    const currentDone = new Set(
      completionsAll
        .filter((x) => x.periodKey === pk && list.some((t) => t.id === x.taskId))
        .map((x) => x.taskId)
    );
    const prevDone = prevPk
      ? new Set(
          completionsAll
            .filter((x) => x.periodKey === prevPk && list.some((t) => t.id === x.taskId))
            .map((x) => x.taskId)
        )
      : new Set<string>();

    const openTasks = list.filter((t) => !currentDone.has(t.id));
    const overdueTasks = prevPk ? list.filter((t) => !prevDone.has(t.id)) : [];

    totalOpen += openTasks.length;
    totalDone += currentDone.size;
    totalOverdue += overdueTasks.length;

    return { checklist: c, openTasks, overdueTasks, doneCount: currentDone.size, totalCount: list.length };
  });

  const base = `/h/${tenantToken}/followup`;
  const qs = (next: Partial<{ tab: Tab; dept: string; user: string }>) => {
    const p = new URLSearchParams();
    if (next.tab) p.set("tab", next.tab);
    const d = next.dept ?? deptFilter;
    const u = next.user ?? userFilter;
    if (d) p.set("dept", d);
    if (u) p.set("user", u);
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };

  const history = completionsAll.slice(0, 100);
  const taskMap = new Map(taskRows.map((t) => [t.id, t]));
  const checklistMap = new Map(checklistRows.map((c) => [c.id, c]));

  return (
    <div>
      <div className="mb-6">
        <p className="kicker mb-2">Uppföljning</p>
        <h1 className="text-h1 font-display">Vad är inte klart?</h1>
        <p className="mt-2 text-body text-ink-70">
          Överblick över dagens rutiner, missade perioder och historik.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4 mb-8 max-w-[560px]">
        <Stat label="Klara" value={totalDone} tone="ok" />
        <Stat label="Ej klara" value={totalOpen} tone={totalOpen > 0 ? "alert" : "muted"} />
        <Stat label="Missade" value={totalOverdue} tone={totalOverdue > 0 ? "alert" : "muted"} />
      </div>

      <form className="mb-6 flex flex-wrap items-end gap-3" method="get" action={base}>
        <input type="hidden" name="tab" value={tab} />
        <div>
          <label className="label" htmlFor="dept">
            Avdelning
          </label>
          <select id="dept" name="dept" defaultValue={deptFilter ?? ""} className="input w-56">
            <option value="">Alla avdelningar</option>
            {deptRows.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="user">
            Ansvarig
          </label>
          <select id="user" name="user" defaultValue={userFilter ?? ""} className="input w-56">
            <option value="">Alla personer</option>
            {staffRows.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Filtrera
        </button>
        {(deptFilter || userFilter) && (
          <Link href={qs({ tab, dept: "", user: "" })} className="btn-ghost">
            Rensa
          </Link>
        )}
      </form>

      <div className="flex gap-2 border-b border-rule mb-6">
        <TabLink href={qs({ tab: "open" })} active={tab === "open"}>
          Ej klart just nu
        </TabLink>
        <TabLink href={qs({ tab: "overdue" })} active={tab === "overdue"}>
          Missade perioder
        </TabLink>
        <TabLink href={qs({ tab: "history" })} active={tab === "history"}>
          Historik
        </TabLink>
      </div>

      {tab === "history" ? (
        history.length === 0 ? (
          <Empty>Ingen historik ännu.</Empty>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {history.map((h) => {
              const t = taskMap.get(h.taskId);
              const c = t ? checklistMap.get(t.checklistId) : null;
              return (
                <li key={h.id} className="py-4 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2">
                  <div className="min-w-0">
                    <div className="font-display text-[18px]">{t?.title ?? "Okänd uppgift"}</div>
                    <div className="mt-1 text-caption text-ink-40">
                      {c?.title ?? ""}
                      {c?.departmentId && deptMap.get(c.departmentId)
                        ? ` · ${deptMap.get(c.departmentId)}`
                        : ""}
                    </div>
                    {h.note && <p className="mt-2 text-small text-ink-70">{h.note}</p>}
                  </div>
                  <div className="text-caption text-ink-70 md:text-right whitespace-nowrap">
                    {h.userName || "—"} ·{" "}
                    {new Date(h.completedAt).toLocaleString("sv-SE")}
                  </div>
                </li>
              );
            })}
          </ul>
        )
      ) : grouped.length === 0 ? (
        <Empty>Inga checklistor.</Empty>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ checklist: c, openTasks, overdueTasks, doneCount, totalCount }) => {
            const list = tab === "overdue" ? overdueTasks : openTasks;
            if (list.length === 0) return null;
            return (
              <section key={c.id}>
                <div className="flex items-baseline justify-between gap-4 mb-3">
                  <div>
                    <h2 className="font-display text-h2">{c.title}</h2>
                    <p className="text-caption text-ink-40 uppercase tracking-[0.14em]">
                      {frequencyLabel(c.frequency as Frequency)}
                      {c.departmentId && deptMap.get(c.departmentId)
                        ? ` · ${deptMap.get(c.departmentId)}`
                        : ""}{" "}
                      · {doneCount}/{totalCount} klara
                    </p>
                  </div>
                  <Link href={`/c/${c.token}`} className="text-small text-ink-70 hover:text-ink">
                    Öppna →
                  </Link>
                </div>
                <ul className="space-y-2">
                  {list.map((t) => (
                    <li
                      key={t.id}
                      className="bg-white border border-rule rounded p-3 md:p-4 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="font-display text-[17px]">{t.title}</div>
                        {t.assignedUserId && userMap.get(t.assignedUserId) && (
                          <div className="mt-1 text-caption text-ink-40">
                            Ansvarig: {userMap.get(t.assignedUserId)}
                          </div>
                        )}
                      </div>
                      <span className="chip-attention shrink-0">
                        {tab === "overdue" ? "Missad period" : "Ej klar"}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {grouped.every(({ openTasks, overdueTasks }) =>
            (tab === "overdue" ? overdueTasks : openTasks).length === 0
          ) && (
            <Empty>
              {tab === "overdue" ? "Inga missade perioder just nu." : "Alla uppgifter är klara för denna period."}
            </Empty>
          )}
        </div>
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`px-4 py-2.5 text-small -mb-px border-b-2 ${
        active ? "border-accent text-ink" : "border-transparent text-ink-70 hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "ok" | "alert" | "muted";
}) {
  const tint =
    tone === "ok" ? "bg-accent-soft text-accent-deep" : tone === "alert" ? "bg-[#F3DCCD] text-alert" : "bg-white";
  return (
    <div className={`rounded border border-rule p-4 ${tint}`}>
      <div className="font-display text-[32px] leading-none">{value}</div>
      <div className="mt-2 text-caption uppercase tracking-[0.14em] text-ink-70">{label}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
      {children}
    </div>
  );
}
