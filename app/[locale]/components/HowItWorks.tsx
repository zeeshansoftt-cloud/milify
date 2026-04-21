import Image from "next/image";
import { getTranslations } from "next-intl/server";

export async function HowItWorks() {
  const t = await getTranslations("how");
  const steps = (t.raw("steps") as Array<{ n: string; title: string; body: string }>) ?? [];
  return (
    <section id="how" className="section">
      <div className="container">
        <div className="grid grid-cols-12 gap-x-8 gap-y-10">
          <div className="col-span-12 lg:col-span-6 lg:order-2">
            <div className="max-w-[520px]">
              <p className="kicker mb-5">{t("kicker")}</p>
              <h2 className="text-h1">{t("title")}</h2>
              <p className="mt-6 text-body-lg text-ink-70">{t("body")}</p>

              <ol className="mt-10 space-y-6">
                {steps.map((s) => (
                  <li key={s.n} className="grid grid-cols-[auto_1fr] gap-x-5">
                    <div className="font-display text-[32px] leading-none text-accent pt-1">{s.n}</div>
                    <div>
                      <h3 className="text-h3 font-display">{s.title}</h3>
                      <p className="mt-2 text-body text-ink-70">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 lg:order-1">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded">
              <Image
                src="https://images.unsplash.com/photo-1523705480679-b5d0cc17a656?w=1400&q=80&auto=format&fit=crop"
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(20,21,25,0) 55%, rgba(20,21,25,0.55) 100%)",
                }}
              />
              <div className="absolute left-5 bottom-5 right-5 flex items-end justify-between gap-3">
                <div className="inline-flex items-center gap-2 bg-paper/95 rounded px-3 py-1.5 text-caption text-ink">
                  <QrGlyph />
                  {t("imageCaption")}
                </div>
                <div className="hidden sm:inline-flex items-center gap-1.5 bg-accent/90 text-paper rounded px-2.5 py-1 text-caption">
                  {t("imageBadge")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function QrGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <rect x="0.5" y="0.5" width="5" height="5" rx="0.5" stroke="#14594A" />
      <rect x="8.5" y="0.5" width="5" height="5" rx="0.5" stroke="#14594A" />
      <rect x="0.5" y="8.5" width="5" height="5" rx="0.5" stroke="#14594A" />
      <rect x="2" y="2" width="2" height="2" fill="#14594A" />
      <rect x="10" y="2" width="2" height="2" fill="#14594A" />
      <rect x="2" y="10" width="2" height="2" fill="#14594A" />
      <rect x="8.5" y="8.5" width="2" height="2" fill="#14594A" />
      <rect x="11.5" y="11.5" width="2" height="2" fill="#14594A" />
    </svg>
  );
}
