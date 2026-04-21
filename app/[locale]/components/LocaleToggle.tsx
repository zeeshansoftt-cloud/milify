"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function LocaleToggle({ currentLocale }: { currentLocale: string }) {
  const pathname = usePathname() || "/";
  const stripped = pathname.replace(/^\/(sv|en)(?=\/|$)/, "") || "/";
  const svHref = stripped === "/" ? "/sv" : `/sv${stripped}`;
  const enHref = stripped === "/" ? "/en" : `/en${stripped}`;
  return (
    <div className="flex items-center text-caption uppercase tracking-[0.14em]">
      <Link
        href={svHref}
        aria-current={currentLocale === "sv" ? "page" : undefined}
        className={currentLocale === "sv" ? "text-ink" : "text-ink-40 hover:text-ink-70 transition-colors"}
      >
        SV
      </Link>
      <span className="mx-2 text-ink/20">/</span>
      <Link
        href={enHref}
        aria-current={currentLocale === "en" ? "page" : undefined}
        className={currentLocale === "en" ? "text-ink" : "text-ink-40 hover:text-ink-70 transition-colors"}
      >
        EN
      </Link>
    </div>
  );
}
