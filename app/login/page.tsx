import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn, getCurrentUser, getTenantForUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const safeNext = typeof next === "string" && next.startsWith("/") ? next : undefined;

  const current = await getCurrentUser();
  if (current) {
    if (safeNext) redirect(safeNext);
    if (current.role === "admin") redirect("/admin");
    const tenant = await getTenantForUser(current);
    redirect(tenant ? `/h/${tenant.token}` : "/");
  }

  async function doLogin(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const nextRaw = String(formData.get("next") ?? "");
    const nextParam = nextRaw.startsWith("/") ? nextRaw : "";
    const user = await signIn(email, password);
    if (!user) {
      const qs = new URLSearchParams({ error: "1" });
      if (nextParam) qs.set("next", nextParam);
      redirect(`/login?${qs.toString()}`);
    }
    if (nextParam) redirect(nextParam);
    if (user.role === "admin") redirect("/admin");
    const tenant = await getTenantForUser(user);
    redirect(tenant ? `/h/${tenant.token}` : "/");
  }

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="border-b border-rule bg-paper/95">
        <div className="container flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-[18px] leading-none">Milify</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-[420px] mx-auto px-6 py-10">
          <p className="kicker mb-2">Logga in</p>
          <h1 className="text-h1 font-display">Välkommen</h1>
          <p className="mt-2 text-small text-ink-70">
            Logga in för att öppna era checklistor och följa upp dagen.
          </p>
          <form action={doLogin} className="mt-8 space-y-4">
            {safeNext && <input type="hidden" name="next" value={safeNext} />}
            <div>
              <label htmlFor="email" className="label">
                E-post
              </label>
              <input
                id="email"
                type="email"
                name="email"
                required
                autoFocus
                className="input"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Lösenord
              </label>
              <input
                id="password"
                type="password"
                name="password"
                required
                className="input"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <p className="text-small text-alert">Fel e-post eller lösenord.</p>
            )}
            <button type="submit" className="btn-primary w-full">
              Logga in
            </button>
          </form>
        </div>
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
