import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { departments, users } from "@/db/schema";
import {
  createTenantUser,
  deleteTenantUser,
  toggleUserActive,
  updateTenantUser,
} from "../../../actions";

export const dynamic = "force-dynamic";

export default async function TenantUsersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [userRows, deptRows] = await Promise.all([
    db.select().from(users).where(eq(users.tenantId, id)).orderBy(desc(users.createdAt)),
    db.select().from(departments).where(eq(departments.tenantId, id)).orderBy(asc(departments.sortIndex)),
  ]);

  const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-h2">Användare</h2>
        <p className="text-small text-ink-70">
          Skapa inloggningar för personal. De loggar in på /login och kommer direkt till förskolans
          sida.
        </p>
      </div>

      <section className="bg-white border border-rule rounded p-5 md:p-6 max-w-[720px] mb-10">
        <h3 className="font-display text-h3">Ny användare</h3>
        <form action={createTenantUser} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="hidden" name="tenantId" value={id} />
          <div>
            <label className="label" htmlFor="name">
              Namn
            </label>
            <input id="name" name="name" className="input" placeholder="Förnamn Efternamn" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              E-post
            </label>
            <input id="email" name="email" type="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Lösenord (minst 6 tecken)
            </label>
            <input
              id="password"
              name="password"
              type="text"
              required
              minLength={6}
              className="input"
              placeholder="Tillfälligt lösenord"
            />
          </div>
          <div>
            <label className="label" htmlFor="role">
              Roll
            </label>
            <select id="role" name="role" className="input" defaultValue="staff">
              <option value="staff">Personal</option>
              <option value="admin">Administratör (plattform)</option>
            </select>
          </div>
          <div className="md:col-span-2">
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
              Skapa användare
            </button>
          </div>
        </form>
      </section>

      <section>
        <h3 className="font-display text-h3 mb-4">Befintliga användare</h3>
        {userRows.length === 0 ? (
          <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
            Inga användare ännu.
          </div>
        ) : (
          <ul className="space-y-4">
            {userRows.map((u) => {
              const toggle = toggleUserActive.bind(null, id, u.id);
              const del = deleteTenantUser.bind(null, id, u.id);
              return (
                <li key={u.id} className="bg-white border border-rule rounded p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="font-display text-[19px]">{u.name || u.email}</div>
                      <div className="text-caption text-ink-40">{u.email}</div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className={u.isActive ? "chip-ok" : "chip-na"}>
                          {u.isActive ? "Aktiv" : "Inaktiv"}
                        </span>
                        <span className="chip-pending">
                          {u.role === "admin" ? "Admin" : "Personal"}
                        </span>
                        {u.departmentId && (
                          <span className="chip-na">{deptMap.get(u.departmentId) ?? "Avdelning"}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <form action={toggle}>
                        <button type="submit" className="btn-ghost">
                          {u.isActive ? "Inaktivera" : "Aktivera"}
                        </button>
                      </form>
                      <form action={del}>
                        <button type="submit" className="btn-ghost text-alert">
                          Ta bort
                        </button>
                      </form>
                    </div>
                  </div>
                  <details className="mt-4">
                    <summary className="cursor-pointer text-small text-ink-70 hover:text-ink">
                      Redigera
                    </summary>
                    <form
                      action={updateTenantUser}
                      className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      <input type="hidden" name="tenantId" value={id} />
                      <input type="hidden" name="id" value={u.id} />
                      <div>
                        <label className="label">Namn</label>
                        <input name="name" className="input" defaultValue={u.name} />
                      </div>
                      <div>
                        <label className="label">Roll</label>
                        <select name="role" className="input" defaultValue={u.role}>
                          <option value="staff">Personal</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="label">Avdelning</label>
                        <select
                          name="departmentId"
                          className="input"
                          defaultValue={u.departmentId ?? ""}
                        >
                          <option value="">Alla avdelningar</option>
                          {deptRows.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label">Nytt lösenord (valfritt)</label>
                        <input
                          name="password"
                          type="text"
                          minLength={6}
                          className="input"
                          placeholder="Lämna tomt för att behålla"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <button type="submit" className="btn-secondary">
                          Spara ändringar
                        </button>
                      </div>
                    </form>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
