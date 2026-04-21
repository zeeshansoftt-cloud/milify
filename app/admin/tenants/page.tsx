import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";
import { createTenant, toggleTenantActive } from "../actions";
import { CopyLink } from "../components/CopyLink";

export const dynamic = "force-dynamic";

export default async function TenantsPage() {
  const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-h1 font-display">Förskolor</h1>
        <p className="mt-1 text-small text-ink-70">
          Skapa en förskola för att komma igång med checklistor, användare och meddelanden.
        </p>
      </div>

      <section className="bg-white border border-rule rounded p-5 md:p-6 max-w-[640px] mb-10">
        <h2 className="font-display text-h2">Ny förskola</h2>
        <form action={createTenant} className="mt-4 space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Namn
            </label>
            <input
              id="name"
              name="name"
              required
              className="input"
              placeholder="T.ex. Solens förskola"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="locale">
                Standardspråk
              </label>
              <select id="locale" name="locale" className="input" defaultValue="sv">
                <option value="sv">Svenska</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="note">
                Intern notering
              </label>
              <input id="note" name="note" className="input" placeholder="Valfritt" />
            </div>
          </div>
          <button type="submit" className="btn-primary">
            Skapa och seeda checklistor
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-h2 mb-4">Alla förskolor</h2>
        {rows.length === 0 ? (
          <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
            Inga förskolor ännu.
          </div>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {rows.map((t) => {
              const hubUrl = `${base}/h/${t.token}`;
              const toggle = toggleTenantActive.bind(null, t.id);
              return (
                <li key={t.id} className="py-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href={`/admin/tenants/${t.id}`} className="font-display text-h3 hover:underline">
                        {t.name}
                      </Link>
                      <span className={t.isActive ? "chip-ok" : "chip-na"}>
                        {t.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                      <span className="text-caption uppercase tracking-[0.14em] text-ink-40">
                        {t.locale}
                      </span>
                    </div>
                    <div className="mt-2 text-caption text-ink-40 truncate">
                      Personal: <span className="text-ink-70">{hubUrl}</span>
                    </div>
                    {t.note && <div className="mt-1 text-small text-ink-70">{t.note}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CopyLink url={hubUrl} />
                    <form action={toggle}>
                      <button type="submit" className="btn-secondary">
                        {t.isActive ? "Inaktivera" : "Aktivera"}
                      </button>
                    </form>
                    <Link href={`/admin/tenants/${t.id}`} className="btn-ghost">
                      Öppna →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
