import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { checklists, departments, parentLinks, tenants, users } from "@/db/schema";
import { updateTenant } from "../../actions";
import { CopyLink } from "../../components/CopyLink";
import { qrSvg, publicUrl } from "@/lib/qr";

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

  const hubUrl = publicUrl(`/h/${tenant.token}`);
  const hubQrSvg = await qrSvg(hubUrl);
  const hubQrDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(hubQrSvg)}`;

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
        <p className="text-small text-ink-70 mb-4">
          Personal loggar in och öppnar denna URL för att se sin förskolas checklistor och
          uppföljning. Skanna QR-koden i mobilen för att öppna direkt.
        </p>

        <div className="relative overflow-hidden rounded-xl bg-ink text-paper">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-60"
            style={{
              background:
                "radial-gradient(120% 120% at 0% 0%, #14594A 0%, transparent 55%), radial-gradient(120% 120% at 100% 100%, #0E4439 0%, transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
            }}
          />

          <div className="relative grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 p-6 md:p-7 items-center">
            <div className="bg-paper rounded-lg p-3 shadow-soft w-[168px] h-[168px] flex items-center justify-center ring-1 ring-paper/40">
              <div
                className="w-full h-full [&>svg]:w-full [&>svg]:h-full"
                dangerouslySetInnerHTML={{ __html: hubQrSvg }}
              />
            </div>

            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-paper/10 backdrop-blur-sm text-caption uppercase tracking-[0.14em] text-paper/80">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-soft" />
                Personal — hubb
              </div>
              <div className="mt-3 font-display text-[22px] leading-tight text-paper">
                {tenant.name}
              </div>
              <code className="mt-2 block text-caption text-paper/70 break-all">{hubUrl}</code>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <CopyLink url={hubUrl} tone="dark" />
                <a
                  href={hubQrDataUrl}
                  download={`milify-staff-${tenant.token}.svg`}
                  className="btn bg-paper/10 text-paper border border-paper/25 backdrop-blur-sm hover:bg-paper/15"
                >
                  Ladda ner QR (SVG)
                </a>
                <a
                  href={hubUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-ghost text-paper/80 hover:text-paper !px-2"
                >
                  Öppna →
                </a>
              </div>
            </div>
          </div>
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
