import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "admin") redirect("/login?error=1");

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="border-b border-rule bg-paper/95 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14 gap-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-[18px] leading-none">Milify admin</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-small text-ink-70">
            <Link href="/admin/tenants" className="hover:text-ink">
              Förskolor
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="hidden sm:inline text-caption text-ink-40 truncate max-w-[220px]">
              {user.email}
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
        <div className="container py-8 md:py-12">{children}</div>
      </main>
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
