import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTenantByToken } from "@/lib/customer";

export const dynamic = "force-dynamic";

export default async function TenantHubLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenantToken: string }>;
}) {
  const { tenantToken } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/h/${tenantToken}`);

  const tenant = await getTenantByToken(tenantToken);
  if (!tenant) notFound();

  if (user.role !== "admin" && user.tenantId !== tenant.id) {
    redirect("/login?error=forbidden");
  }

  const base = `/h/${tenantToken}`;

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md border-b border-rule">
        <div className="container max-w-[960px] flex items-center justify-between h-14 gap-4">
          <Link href={base} className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-[18px] leading-none">{tenant.name}</span>
          </Link>
          <nav className="flex items-center gap-4 text-small text-ink-70">
            <Link href={base} className="hover:text-ink">
              Rutiner
            </Link>
            <Link href={`${base}/followup`} className="hover:text-ink">
              Uppföljning
            </Link>
            <Link href={`${base}/messages`} className="hover:text-ink">
              Meddelanden
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-caption text-ink-40 truncate max-w-[160px]">
              {user.name || user.email}
            </span>
            <form action="/api/admin/logout" method="post">
              <button type="submit" className="text-small text-ink-70 hover:text-ink">
                Logga ut
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <div className="container max-w-[960px] py-6 md:py-10">{children}</div>
      </main>
      <footer className="border-t border-rule">
        <div className="container max-w-[960px] py-6 text-caption text-ink-70">
          Milify · En lugn digital hubb för förskolan.
        </div>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="4" stroke="#14594A" strokeWidth="1.5" />
      <path
        d="M8 19V9L14 15L20 9V19"
        stroke="#14594A"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
