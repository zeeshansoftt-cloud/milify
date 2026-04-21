import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-rule">
      <div className="container py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-small text-ink-70">
        <div>
          © {year} {t("rights")}
        </div>
        <div className="flex items-center gap-6">
          <a href="#contact" className="hover:text-ink transition-colors">
            {t("contact")}
          </a>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-rule px-4 py-1.5 text-ink hover:bg-ink hover:text-paper transition-colors"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t("dashboardLogin")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
