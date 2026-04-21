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
        </div>
      </div>
    </footer>
  );
}
