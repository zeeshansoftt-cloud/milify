import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { tenants } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function TenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  const base = `/admin/tenants/${id}`;

  return (
    <div>
      <div className="mb-6">
        <Link href="/admin/tenants" className="text-small text-ink-70 hover:text-ink">
          ← Alla förskolor
        </Link>
        <h1 className="mt-2 text-h1 font-display">{tenant.name}</h1>
      </div>
      <nav className="flex flex-wrap gap-1 border-b border-rule mb-8">
        <Tab href={base}>Översikt</Tab>
        <Tab href={`${base}/departments`}>Avdelningar</Tab>
        <Tab href={`${base}/users`}>Användare</Tab>
        <Tab href={`${base}/checklists`}>Checklistor</Tab>
        <Tab href={`${base}/parents`}>Föräldralänkar</Tab>
      </nav>
      {children}
    </div>
  );
}

function Tab({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-4 py-2.5 text-small text-ink-70 hover:text-ink border-b-2 border-transparent hover:border-ink/20 -mb-px"
    >
      {children}
    </Link>
  );
}
