import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { departments } from "@/db/schema";
import { createDepartment, deleteDepartment, renameDepartment } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function DepartmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await db
    .select()
    .from(departments)
    .where(eq(departments.tenantId, id))
    .orderBy(asc(departments.sortIndex), asc(departments.name));

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-h2">Avdelningar</h2>
        <p className="text-small text-ink-70">
          Grupper barnen ska knytas till (t.ex. Solrosen, Blåklockan). Används för att filtrera
          checklistor och rikta meddelanden.
        </p>
      </div>

      <section className="bg-white border border-rule rounded p-5 md:p-6 max-w-[560px] mb-8">
        <h3 className="font-display text-h3">Ny avdelning</h3>
        <form action={createDepartment} className="mt-4 flex items-end gap-3">
          <input type="hidden" name="tenantId" value={id} />
          <div className="flex-1">
            <label className="label" htmlFor="name">
              Namn
            </label>
            <input id="name" name="name" required className="input" placeholder="T.ex. Solrosen" />
          </div>
          <button type="submit" className="btn-primary">
            Lägg till
          </button>
        </form>
      </section>

      {rows.length === 0 ? (
        <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
          Inga avdelningar än.
        </div>
      ) : (
        <ul className="divide-y divide-rule border-y border-rule max-w-[640px]">
          {rows.map((d) => {
            const del = deleteDepartment.bind(null, id, d.id);
            return (
              <li key={d.id} className="py-3 flex items-center gap-2">
                <form action={renameDepartment} className="flex-1 flex items-center gap-2">
                  <input type="hidden" name="tenantId" value={id} />
                  <input type="hidden" name="id" value={d.id} />
                  <input name="name" defaultValue={d.name} className="input flex-1" />
                  <button type="submit" className="btn-ghost">
                    Spara
                  </button>
                </form>
                <form action={del}>
                  <button type="submit" className="btn-ghost text-alert" aria-label="Ta bort">
                    Ta bort
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
