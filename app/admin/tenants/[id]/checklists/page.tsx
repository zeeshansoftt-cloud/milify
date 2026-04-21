import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { checklists, departments } from "@/db/schema";
import { createChecklist, toggleChecklistArchived } from "../../../actions";
import { frequencyLabel, type Frequency } from "@/lib/period";
import { CopyLink } from "../../../components/CopyLink";

export const dynamic = "force-dynamic";

export default async function ChecklistsListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [checklistRows, deptRows] = await Promise.all([
    db
      .select()
      .from(checklists)
      .where(eq(checklists.tenantId, id))
      .orderBy(asc(checklists.isArchived), asc(checklists.sortIndex)),
    db.select().from(departments).where(eq(departments.tenantId, id)).orderBy(asc(departments.sortIndex)),
  ]);

  const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  const active = checklistRows.filter((c) => !c.isArchived);
  const archived = checklistRows.filter((c) => c.isArchived);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-h2">Checklistor</h2>
        <p className="text-small text-ink-70">
          Varje checklista har en egen QR-kod. Skriv ut den och sätt upp där rutinen utförs.
        </p>
      </div>

      <section className="bg-white border border-rule rounded p-5 md:p-6 max-w-[720px] mb-10">
        <h3 className="font-display text-h3">Ny checklista</h3>
        <form action={createChecklist} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="hidden" name="tenantId" value={id} />
          <div className="md:col-span-2">
            <label className="label" htmlFor="title">
              Titel
            </label>
            <input
              id="title"
              name="title"
              required
              className="input"
              placeholder="T.ex. Öppningsrutin"
            />
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="description">
              Beskrivning (valfritt)
            </label>
            <input id="description" name="description" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="frequency">
              Frekvens
            </label>
            <select id="frequency" name="frequency" defaultValue="daily" className="input">
              <option value="daily">Dagligen</option>
              <option value="weekly">Veckovis</option>
              <option value="monthly">Månadsvis</option>
              <option value="custom">Engång</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="departmentId">
              Avdelning (valfritt)
            </label>
            <select id="departmentId" name="departmentId" className="input" defaultValue="">
              <option value="">Alla avdelningar</option>
              {deptRows.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Skapa checklista
            </button>
          </div>
        </form>
      </section>

      <ChecklistList
        tenantId={id}
        title="Aktiva"
        rows={active}
        deptMap={deptMap}
        base={base}
      />
      {archived.length > 0 && (
        <div className="mt-10">
          <ChecklistList
            tenantId={id}
            title="Arkiverade"
            rows={archived}
            deptMap={deptMap}
            base={base}
          />
        </div>
      )}
    </div>
  );
}

function ChecklistList({
  tenantId,
  title,
  rows,
  deptMap,
  base,
}: {
  tenantId: string;
  title: string;
  rows: Array<{
    id: string;
    title: string;
    description: string | null;
    frequency: string;
    departmentId: string | null;
    token: string;
    isArchived: boolean;
  }>;
  deptMap: Map<string, string>;
  base: string;
}) {
  return (
    <section>
      <h3 className="font-display text-h3 mb-4">{title}</h3>
      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
          Inga checklistor.
        </div>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule">
          {rows.map((c) => {
            const toggle = toggleChecklistArchived.bind(null, tenantId, c.id);
            const qrUrl = `${base}/c/${c.token}`;
            return (
              <li key={c.id} className="py-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      href={`/admin/tenants/${tenantId}/checklists/${c.id}`}
                      className="font-display text-h3 hover:underline"
                    >
                      {c.title}
                    </Link>
                    <span className="chip-pending">{frequencyLabel(c.frequency as Frequency)}</span>
                    {c.departmentId && (
                      <span className="chip-na">{deptMap.get(c.departmentId) ?? "Avdelning"}</span>
                    )}
                    {c.isArchived && <span className="chip-na">Arkiverad</span>}
                  </div>
                  {c.description && (
                    <p className="mt-1 text-small text-ink-70">{c.description}</p>
                  )}
                  <div className="mt-2 text-caption text-ink-40 truncate">QR: {qrUrl}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <CopyLink url={qrUrl} />
                  <Link
                    href={`/admin/tenants/${tenantId}/checklists/${c.id}`}
                    className="btn-ghost"
                  >
                    Öppna →
                  </Link>
                  <form action={toggle}>
                    <button type="submit" className="btn-ghost">
                      {c.isArchived ? "Återställ" : "Arkivera"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
