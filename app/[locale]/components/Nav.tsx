import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocaleToggle } from "./LocaleToggle";

export async function Nav({ locale }: { locale: string }) {
  const t = await getTranslations("nav");
  const base = `/${locale}`;
  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md border-b border-rule/60 supports-[backdrop-filter]:bg-paper/70">
      <div className="container flex items-center justify-between h-[68px]">
        <Link href={`${base}/`} className="flex items-center gap-2" aria-label="Milify">
          <Logo />
          <span className="font-display text-[20px] leading-none">{t("brand")}</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-small text-ink-70">
          <a href="#how" className="hover:text-ink transition-colors">
            {t("howItWorks")}
          </a>
          <a href="#modules" className="hover:text-ink transition-colors">
            {t("modules")}
          </a>
          <a href="#trust" className="hover:text-ink transition-colors">
            {t("trust")}
          </a>
          <a href="#contact" className="hover:text-ink transition-colors">
            {t("contact")}
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <LocaleToggle currentLocale={locale} />
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="4" stroke="#14594A" strokeWidth="1.5" />
      <path d="M8 19V9L14 15L20 9V19" stroke="#14594A" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
