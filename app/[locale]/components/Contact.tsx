import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { ContactForm } from "./ContactForm";

export async function Contact() {
  const t = await getTranslations("contact");
  return (
    <section id="contact" className="section bg-paper">
      <div className="container">
        <div className="grid grid-cols-12 gap-x-8 gap-y-10 items-start">
          <div className="col-span-12 lg:col-span-5">
            <p className="kicker mb-5">{t("kicker")}</p>
            <h2 className="text-h1">{t("title")}</h2>
            <p className="mt-6 text-body-lg text-ink-70 max-w-prose">{t("body")}</p>

            <div className="mt-10 relative aspect-[4/3] w-full overflow-hidden rounded">
              <Image
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80&auto=format&fit=crop"
                alt=""
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(20,21,25,0) 50%, rgba(20,21,25,0.6) 100%)",
                }}
              />
              <div className="absolute left-5 bottom-5 right-5">
                <div className="inline-flex items-center gap-2 bg-paper/95 rounded px-3 py-1.5 text-caption text-ink">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                  {t("responseBadge")}
                </div>
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <div className="rounded-lg bg-surface p-6 md:p-8 shadow-soft ring-1 ring-rule">
              <ContactForm
                labels={{
                  name: t("name"),
                  email: t("email"),
                  org: t("org"),
                  message: t("message"),
                  send: t("send"),
                  success: t("success"),
                  error: t("error"),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
