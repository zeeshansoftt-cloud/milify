import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { departments, messages } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getTenantByToken } from "@/lib/customer";
import { createMessage, deleteMessage } from "./actions";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ tenantToken: string }>;
}) {
  const { tenantToken } = await params;
  const tenant = await getTenantByToken(tenantToken);
  if (!tenant) notFound();

  const user = await getCurrentUser();

  const [deptRows, messageRows] = await Promise.all([
    db.select().from(departments).where(eq(departments.tenantId, tenant.id)).orderBy(asc(departments.sortIndex)),
    db
      .select()
      .from(messages)
      .where(eq(messages.tenantId, tenant.id))
      .orderBy(desc(messages.createdAt)),
  ]);
  const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));

  return (
    <div>
      <div className="mb-6">
        <p className="kicker mb-2">Kommunikation</p>
        <h1 className="text-h1 font-display">Meddelanden till vårdnadshavare</h1>
        <p className="mt-2 text-body text-ink-70">
          Skriv ett meddelande på svenska. Föräldrar öppnar det via sin länk och ser det automatiskt
          översatt till valt språk.
        </p>
      </div>

      <section className="bg-white border border-rule rounded p-5 md:p-6 mb-10 max-w-[720px]">
        <h2 className="font-display text-h2">Nytt meddelande</h2>
        <form action={createMessage} className="mt-4 space-y-4">
          <input type="hidden" name="tenantToken" value={tenantToken} />
          <input type="hidden" name="sourceLang" value={tenant.locale} />
          <div>
            <label htmlFor="title" className="label">
              Rubrik
            </label>
            <input
              id="title"
              name="title"
              required
              className="input"
              placeholder="T.ex. Utflykt på fredag"
              maxLength={200}
            />
          </div>
          <div>
            <label htmlFor="body" className="label">
              Meddelande
            </label>
            <textarea
              id="body"
              name="body"
              required
              rows={5}
              className="textarea"
              placeholder="Skriv tydligt och kortfattat."
              maxLength={4000}
            />
          </div>
          <div>
            <label htmlFor="departmentId" className="label">
              Skicka till
            </label>
            <select id="departmentId" name="departmentId" defaultValue="" className="input max-w-[320px]">
              <option value="">Alla avdelningar</option>
              {deptRows.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Skicka meddelande
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-h2 mb-4">Historik</h2>
        {messageRows.length === 0 ? (
          <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
            Inga meddelanden skickade ännu.
          </div>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {messageRows.map((m) => {
              const boundDelete = deleteMessage.bind(null, tenantToken, m.id);
              const canDelete = user && (user.role === "admin" || user.id === m.authorId);
              return (
                <li key={m.id} className="py-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                  <div className="min-w-0">
                    <div className="font-display text-h3">{m.title}</div>
                    <p className="mt-2 text-body text-ink-70 whitespace-pre-wrap">{m.body}</p>
                    <div className="mt-3 text-caption uppercase tracking-[0.14em] text-ink-40">
                      {new Date(m.createdAt).toLocaleString("sv-SE")} · {m.authorName || "—"} ·{" "}
                      {m.departmentId ? deptMap.get(m.departmentId) ?? "Avdelning" : "Alla avdelningar"}
                    </div>
                  </div>
                  {canDelete && (
                    <form action={boundDelete}>
                      <button type="submit" className="btn-ghost text-alert">
                        Ta bort
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
