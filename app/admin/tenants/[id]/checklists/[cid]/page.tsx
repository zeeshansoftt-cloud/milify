import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { checklists, departments, tasks, users } from "@/db/schema";
import {
  archiveTask,
  createTask,
  moveTask,
  updateChecklist,
  updateTask,
} from "../../../../actions";
import { qrSvg, publicUrl } from "@/lib/qr";
import { CopyLink } from "../../../../components/CopyLink";

export const dynamic = "force-dynamic";

export default async function ChecklistDetailPage({
  params,
}: {
  params: Promise<{ id: string; cid: string }>;
}) {
  const { id: tenantId, cid } = await params;
  const [checklist] = await db.select().from(checklists).where(eq(checklists.id, cid)).limit(1);
  if (!checklist || checklist.tenantId !== tenantId) notFound();

  const [deptRows, userRows, taskRows] = await Promise.all([
    db.select().from(departments).where(eq(departments.tenantId, tenantId)).orderBy(asc(departments.sortIndex)),
    db.select().from(users).where(eq(users.tenantId, tenantId)).orderBy(asc(users.name)),
    db
      .select()
      .from(tasks)
      .where(and(eq(tasks.checklistId, cid), eq(tasks.isArchived, false)))
      .orderBy(asc(tasks.sortIndex)),
  ]);

  const url = publicUrl(`/c/${checklist.token}`);
  const svg = await qrSvg(url);
  const svgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/admin/tenants/${tenantId}/checklists`}
          className="text-small text-ink-70 hover:text-ink"
        >
          ← Alla checklistor
        </Link>
        <h2 className="mt-2 font-display text-h2">{checklist.title}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        <section>
          <div className="bg-white border border-rule rounded p-5 md:p-6 mb-8">
            <h3 className="font-display text-h3">Inställningar</h3>
            <form action={updateChecklist} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="hidden" name="tenantId" value={tenantId} />
              <input type="hidden" name="id" value={checklist.id} />
              <div className="md:col-span-2">
                <label className="label">Titel</label>
                <input name="title" required className="input" defaultValue={checklist.title} />
              </div>
              <div className="md:col-span-2">
                <label className="label">Beskrivning</label>
                <input name="description" className="input" defaultValue={checklist.description ?? ""} />
              </div>
              <div>
                <label className="label">Frekvens</label>
                <select name="frequency" className="input" defaultValue={checklist.frequency}>
                  <option value="daily">Dagligen</option>
                  <option value="weekly">Veckovis</option>
                  <option value="monthly">Månadsvis</option>
                  <option value="custom">Engång</option>
                </select>
              </div>
              <div>
                <label className="label">Avdelning</label>
                <select
                  name="departmentId"
                  className="input"
                  defaultValue={checklist.departmentId ?? ""}
                >
                  <option value="">Alla avdelningar</option>
                  {deptRows.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <button type="submit" className="btn-secondary">
                  Spara
                </button>
              </div>
            </form>
          </div>

          <h3 className="font-display text-h3 mb-4">Uppgifter</h3>
          <ul className="space-y-2 mb-6">
            {taskRows.map((t, idx) => {
              const up = moveTask.bind(null, tenantId, cid, t.id, "up");
              const down = moveTask.bind(null, tenantId, cid, t.id, "down");
              const arch = archiveTask.bind(null, tenantId, cid, t.id);
              return (
                <li key={t.id} className="bg-white border border-rule rounded p-3">
                  <form
                    action={updateTask}
                    className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-2 items-end"
                  >
                    <input type="hidden" name="tenantId" value={tenantId} />
                    <input type="hidden" name="checklistId" value={cid} />
                    <input type="hidden" name="id" value={t.id} />
                    <div>
                      <label className="label sr-only">Titel</label>
                      <input name="title" defaultValue={t.title} className="input" />
                    </div>
                    <div>
                      <label className="label sr-only">Ansvarig</label>
                      <select
                        name="assignedUserId"
                        className="input"
                        defaultValue={t.assignedUserId ?? ""}
                      >
                        <option value="">Ingen ansvarig</option>
                        {userRows.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <button type="submit" className="btn-ghost">
                        Spara
                      </button>
                    </div>
                  </form>
                  <div className="mt-2 flex items-center gap-1 justify-end">
                    <form action={up}>
                      <button
                        type="submit"
                        className="btn-ghost"
                        disabled={idx === 0}
                        aria-label="Flytta upp"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={down}>
                      <button
                        type="submit"
                        className="btn-ghost"
                        disabled={idx === taskRows.length - 1}
                        aria-label="Flytta ner"
                      >
                        ↓
                      </button>
                    </form>
                    <form action={arch}>
                      <button type="submit" className="btn-ghost text-alert">
                        Ta bort
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
            {taskRows.length === 0 && (
              <li className="rounded border border-dashed border-rule p-6 text-center text-small text-ink-70">
                Inga uppgifter ännu. Lägg till nedan.
              </li>
            )}
          </ul>

          <form action={createTask} className="flex items-end gap-2 max-w-[640px]">
            <input type="hidden" name="tenantId" value={tenantId} />
            <input type="hidden" name="checklistId" value={cid} />
            <div className="flex-1">
              <label className="label" htmlFor="newTaskTitle">
                Ny uppgift
              </label>
              <input
                id="newTaskTitle"
                name="title"
                required
                className="input"
                placeholder="T.ex. Kontrollera utrymningsvägar"
              />
            </div>
            <div>
              <label className="label sr-only">Ansvarig</label>
              <select name="assignedUserId" className="input w-48" defaultValue="">
                <option value="">Ingen ansvarig</option>
                {userRows.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Lägg till
            </button>
          </form>
        </section>

        <aside className="bg-white border border-rule rounded p-5 h-fit">
          <h3 className="font-display text-h3">QR-kod</h3>
          <p className="text-small text-ink-70 mt-1">Sätt upp där rutinen utförs.</p>
          <div
            className="mt-4 aspect-square w-full bg-white border border-rule rounded flex items-center justify-center overflow-hidden"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <div className="mt-3 text-caption text-ink-40 break-all">{url}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyLink url={url} />
            <a href={svgDataUrl} download={`milify-qr-${checklist.token}.svg`} className="btn-ghost">
              Ladda ner SVG
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
