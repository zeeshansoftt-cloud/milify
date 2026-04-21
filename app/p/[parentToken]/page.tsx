import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  departments,
  messageTranslations,
  messages,
  parentLinks,
  tenants,
} from "@/db/schema";
import { createId } from "@/lib/tokens";
import { isDeeplConfigured, translate } from "@/lib/translate";
import { setParentLanguage } from "./actions";
import { supportedParentLangs } from "./langs";

export const dynamic = "force-dynamic";

const LANG_LABELS: Record<string, string> = {
  sv: "Svenska",
  en: "English",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  pl: "Polski",
  ar: "العربية",
  fi: "Suomi",
  da: "Dansk",
  nb: "Norsk",
  nl: "Nederlands",
  pt: "Português",
  tr: "Türkçe",
  uk: "Українська",
  ru: "Русский",
};

const UI_STRINGS: Record<string, Record<string, string>> = {
  sv: {
    header: "Meddelanden från förskolan",
    empty: "Inga meddelanden ännu.",
    language: "Språk",
    switch: "Byt",
    translatedBy: "Översatt automatiskt",
    notTranslated: "Översättning inte tillgänglig — visas på originalspråk.",
  },
  en: {
    header: "Messages from the preschool",
    empty: "No messages yet.",
    language: "Language",
    switch: "Change",
    translatedBy: "Translated automatically",
    notTranslated: "Translation unavailable — shown in original language.",
  },
};

function t(lang: string, key: string): string {
  return UI_STRINGS[lang]?.[key] ?? UI_STRINGS.en[key] ?? key;
}

export default async function ParentPage({
  params,
}: {
  params: Promise<{ parentToken: string }>;
}) {
  const { parentToken } = await params;

  const linkRow = (
    await db.select().from(parentLinks).where(eq(parentLinks.token, parentToken)).limit(1)
  )[0];
  if (!linkRow || !linkRow.isActive) notFound();

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, linkRow.tenantId)).limit(1);
  if (!tenant) notFound();

  const dept = linkRow.departmentId
    ? (await db.select().from(departments).where(eq(departments.id, linkRow.departmentId)).limit(1))[0]
    : null;

  const tenantMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.tenantId, tenant.id))
    .orderBy(desc(messages.createdAt))
    .limit(100);

  const shown = linkRow.departmentId
    ? tenantMessages.filter((m) => !m.departmentId || m.departmentId === linkRow.departmentId)
    : tenantMessages;

  const displayLang = linkRow.language || "sv";
  const messageIds = shown.map((m) => m.id);
  const existingTranslations = messageIds.length
    ? await db
        .select()
        .from(messageTranslations)
        .where(
          and(
            inArray(messageTranslations.messageId, messageIds),
            eq(messageTranslations.lang, displayLang)
          )
        )
    : [];
  const translatedMap = new Map(existingTranslations.map((x) => [x.messageId, x]));

  type Rendered = {
    id: string;
    title: string;
    body: string;
    createdAt: string;
    authorName: string;
    translated: boolean;
  };

  const rendered: Rendered[] = [];
  for (const m of shown) {
    const sameLang = (m.sourceLang || "sv").toLowerCase() === displayLang.toLowerCase();
    if (sameLang) {
      rendered.push({
        id: m.id,
        title: m.title,
        body: m.body,
        createdAt: m.createdAt,
        authorName: m.authorName,
        translated: false,
      });
      continue;
    }
    const cached = translatedMap.get(m.id);
    if (cached) {
      rendered.push({
        id: m.id,
        title: cached.title,
        body: cached.body,
        createdAt: m.createdAt,
        authorName: m.authorName,
        translated: true,
      });
      continue;
    }
    if (!isDeeplConfigured()) {
      rendered.push({
        id: m.id,
        title: m.title,
        body: m.body,
        createdAt: m.createdAt,
        authorName: m.authorName,
        translated: false,
      });
      continue;
    }
    const [titleT, bodyT] = await Promise.all([
      translate(m.title, displayLang, m.sourceLang),
      translate(m.body, displayLang, m.sourceLang),
    ]);
    if (titleT.translated && bodyT.translated) {
      try {
        await db.insert(messageTranslations).values({
          id: createId(),
          messageId: m.id,
          lang: displayLang,
          title: titleT.text,
          body: bodyT.text,
        });
      } catch {
        // ignore duplicate race
      }
      rendered.push({
        id: m.id,
        title: titleT.text,
        body: bodyT.text,
        createdAt: m.createdAt,
        authorName: m.authorName,
        translated: true,
      });
    } else {
      rendered.push({
        id: m.id,
        title: m.title,
        body: m.body,
        createdAt: m.createdAt,
        authorName: m.authorName,
        translated: false,
      });
    }
  }

  const langAction = setParentLanguage.bind(null, parentToken);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <header className="sticky top-0 z-30 bg-paper/95 backdrop-blur-md border-b border-rule">
        <div className="container max-w-[720px] flex items-center justify-between h-14 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Logo />
            <span className="font-display text-[18px] leading-none truncate">{tenant.name}</span>
          </div>
          <form action={langAction} className="flex items-center gap-2">
            <label htmlFor="lang" className="sr-only">
              {t(displayLang, "language")}
            </label>
            <select
              id="lang"
              name="lang"
              defaultValue={displayLang}
              className="h-9 px-2 rounded bg-white border border-rule text-small"
            >
              {supportedParentLangs.map((code) => (
                <option key={code} value={code}>
                  {LANG_LABELS[code] ?? code}
                </option>
              ))}
            </select>
            <button type="submit" className="btn-ghost !h-9 !px-3 text-small">
              {t(displayLang, "switch")}
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1">
        <div className="container max-w-[720px] py-6 md:py-10">
          <div className="mb-6">
            <p className="kicker mb-2">
              {dept ? dept.name : t(displayLang, "header")}
            </p>
            <h1 className="text-h1 font-display">{t(displayLang, "header")}</h1>
          </div>

          {rendered.length === 0 ? (
            <div className="rounded border border-dashed border-rule p-10 text-center text-body text-ink-70">
              {t(displayLang, "empty")}
            </div>
          ) : (
            <ul className="space-y-4">
              {rendered.map((m) => (
                <li key={m.id} className="bg-white border border-rule rounded p-5 md:p-6">
                  <h2 className="font-display text-h2">{m.title}</h2>
                  <p className="mt-3 text-body text-ink-70 whitespace-pre-wrap">{m.body}</p>
                  <div className="mt-4 text-caption uppercase tracking-[0.14em] text-ink-40">
                    {new Date(m.createdAt).toLocaleString("sv-SE")} · {m.authorName || "—"}
                    {m.translated ? ` · ${t(displayLang, "translatedBy")}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!isDeeplConfigured() && shown.some((m) => (m.sourceLang || "sv").toLowerCase() !== displayLang) && (
            <p className="mt-6 text-caption text-ink-40">{t(displayLang, "notTranslated")}</p>
          )}
        </div>
      </main>

      <footer className="border-t border-rule">
        <div className="container max-w-[720px] py-6 text-caption text-ink-70">
          Milify · {dept ? dept.name : ""}
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
