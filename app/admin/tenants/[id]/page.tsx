import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { checklists, departments, parentLinks, tenants, users } from "@/db/schema";
import { updateTenant } from "../../actions";
import { CopyLink } from "../../components/CopyLink";

export const dynamic = "force-dynamic";

export default async function TenantOverview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  const [deptCount, userCount, checklistCount, parentCount] = await Promise.all([
    db.select({ id: departments.id }).from(departments).where(eq(departments.tenantId, id)).then((r) => r.length),
    db.select({ id: users.id }).from(users).where(eq(users.tenantId, id)).then((r) => r.length),
    db
      .select({ id: checklists.id })
      .from(checklists)
      .where(and(eq(checklists.tenantId, id), eq(checklists.isArchived, false)))
      .then((r) => r.length),
    db.select({ id: parentLinks.id }).from(parentLinks).where(eq(parentLinks.tenantId, id)).then((r) => r.length),
  ]);

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const hubUrl = `${base}/h/${tenant.token}`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10">
      <section className="bg-white border border-rule rounded p-5 md:p-6 max-w-[640px]">
        <h2 className="font-display text-h2">Detaljer</h2>
        <form action={updateTenant} className="mt-4 space-y-4">
          <input type="hidden" name="id" value={tenant.id} />
          <div>
            <label className="label" htmlFor="name">
              Namn
            </label>
            <input id="name" name="name" required className="input" defaultValue={tenant.name} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="locale">
                Standardspråk
              </label>
              <select id="locale" name="locale" className="input" defaultValue={tenant.locale}>
                <option value="sv">Svenska</option>
                <option value="en">English</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="note">
                Intern notering
              </label>
              <input id="note" name="note" className="input" defaultValue={tenant.note ?? ""} />
            </div>
          </div>
          <button type="submit" className="btn-secondary">
            Spara
          </button>
        </form>
      </section>

      <section>
        <h2 className="font-display text-h2 mb-4">Personallänk</h2>
        <p className="text-small text-ink-70 mb-3">
          Personal loggar in och öppnar denna URL för att se sin förskolas checklistor och uppföljning.
        </p>
        <div className="bg-white border border-rule rounded p-4 flex items-center gap-3">
          <code className="text-caption text-ink-70 truncate flex-1">{hubUrl}</code>
          <CopyLink url={hubUrl} />
        </div>

        <h2 className="font-display text-h2 mt-10 mb-4">Översikt</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Avdelningar" value={deptCount} />
          <StatCard label="Användare" value={userCount} />
          <StatCard label="Checklistor" value={checklistCount} />
          <StatCard label="Föräldralänkar" value={parentCount} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white border border-rule rounded p-4">
      <div className="font-display text-[32px] leading-none">{value}</div>
      <div className="mt-2 text-caption uppercase tracking-[0.14em] text-ink-70">{label}</div>
    </div>
  );
}
