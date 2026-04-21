import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { departments, parentLinks } from "@/db/schema";
import { createParentLink, deleteParentLink, toggleParentLinkActive } from "../../../actions";
import { CopyLink } from "../../../components/CopyLink";
import { publicUrl } from "@/lib/qr";

export const dynamic = "force-dynamic";

const LANGS: Array<{ code: string; label: string }> = [
  { code: "sv", label: "Svenska" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "pl", label: "Polski" },
  { code: "ar", label: "العربية" },
  { code: "fi", label: "Suomi" },
  { code: "da", label: "Dansk" },
  { code: "nb", label: "Norsk" },
  { code: "nl", label: "Nederlands" },
  { code: "pt", label: "Português" },
  { code: "tr", label: "Türkçe" },
  { code: "uk", label: "Українська" },
  { code: "ru", label: "Русский" },
];

export default async function ParentLinksPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [linkRows, deptRows] = await Promise.all([
    db
      .select()
      .from(parentLinks)
      .where(eq(parentLinks.tenantId, id))
      .orderBy(desc(parentLinks.createdAt)),
    db
      .select()
      .from(departments)
      .where(eq(departments.tenantId, id))
      .orderBy(asc(departments.sortIndex)),
  ]);
  const deptMap = new Map(deptRows.map((d) => [d.id, d.name]));
  const langMap = new Map(LANGS.map((l) => [l.code, l.label]));

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-h2">Föräldralänkar</h2>
        <p className="text-small text-ink-70">
          Skapa en läsbar länk per familj/avdelning. Föräldern öppnar den i mobilen och ser era
          meddelanden översatta till sitt språk.
        </p>
      </div>

      <section className="bg-white border border-rule rounded p-5 md:p-6 max-w-[720px] mb-10">
        <h3 className="font-display text-h3">Ny länk</h3>
        <form action={createParentLink} className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="hidden" name="tenantId" value={id} />
          <div>
            <label className="label" htmlFor="label">
              Etikett
            </label>
            <input id="label" name="label" className="input" placeholder="T.ex. Familjen Andersson" />
          </div>
          <div>
            <label className="label" htmlFor="language">
              Språk
            </label>
            <select id="language" name="language" className="input" defaultValue="sv">
              {LANGS.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label" htmlFor="departmentId">
              Avdelning (valfritt)
            </label>
            <select id="departmentId" name="departmentId" className="input" defaultValue="">
              <option value="">Alla avdelningar</option>
              {deptRows.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Skapa länk
            </button>
          </div>
        </form>
      </section>

      <section>
        <h3 className="font-display text-h3 mb-4">Befintliga länkar</h3>
        {linkRows.length === 0 ? (
          <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
            Inga länkar än.
          </div>
        ) : (
          <ul className="divide-y divide-rule border-y border-rule">
            {linkRows.map((l) => {
              const url = publicUrl(`/p/${l.token}`);
              const toggle = toggleParentLinkActive.bind(null, id, l.id);
              const del = deleteParentLink.bind(null, id, l.id);
              return (
                <li key={l.id} className="py-5 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                  <div className="min-w-0">
                    <div className="font-display text-[19px]">{l.label || "Utan etikett"}</div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className={l.isActive ? "chip-ok" : "chip-na"}>
                        {l.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                      <span className="chip-pending">{langMap.get(l.language) ?? l.language}</span>
                      {l.departmentId && (
                        <span className="chip-na">{deptMap.get(l.departmentId) ?? "Avdelning"}</span>
                      )}
                    </div>
                    <div className="mt-2 text-caption text-ink-40 break-all">{url}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CopyLink url={url} />
                    <form action={toggle}>
                      <button type="submit" className="btn-ghost">
                        {l.isActive ? "Inaktivera" : "Aktivera"}
                      </button>
                    </form>
                    <form action={del}>
                      <button type="submit" className="btn-ghost text-alert">
                        Ta bort
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
