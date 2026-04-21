import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Hero({ locale }: { locale: string }) {
  const t = await getTranslations("hero");
  const base = `/${locale}`;

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1672552226650-796f40198c47?w=2400&q=80&auto=format&fit=crop"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 55%" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,21,25,0.35) 0%, rgba(20,21,25,0.15) 45%, rgba(20,21,25,0.85) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(20,21,25,0.88) 0%, rgba(20,21,25,0.55) 40%, rgba(20,21,25,0.1) 75%, rgba(20,21,25,0) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -left-40 -bottom-40 h-[520px] w-[520px] rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(closest-side, #14594A 0%, transparent 70%)" }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
          }}
        />
      </div>

      <div className="container pt-[clamp(80px,10vw,140px)] pb-[clamp(96px,12vw,160px)]">
        <div className="max-w-[880px] text-paper">
          <p className="kicker mb-6 reveal text-paper/80">{t("kicker")}</p>
          <h1
            className="font-display text-paper text-[clamp(44px,7.5vw,92px)] leading-[1.02] tracking-[-0.02em] max-w-[16ch] reveal"
            style={{ animationDelay: "80ms" }}
          >
            {t("title")}
          </h1>
          <p
            className="mt-8 text-body-lg text-paper/75 max-w-prose reveal"
            style={{ animationDelay: "160ms" }}
          >
            {t("subtitle")}
          </p>
          <div
            className="mt-10 flex flex-wrap items-center gap-3 reveal"
            style={{ animationDelay: "240ms" }}
          >
            <Link href={`${base}#contact`} className="btn-primary">
              {t("primaryCta")}
            </Link>
            <Link
              href={`${base}#how`}
              className="btn bg-paper/10 text-paper border border-paper/25 backdrop-blur-sm hover:bg-paper/15"
            >
              {t("secondaryCta")}
              <span aria-hidden="true" className="ml-2">↓</span>
            </Link>
          </div>
        </div>

        <div
          className="mt-16 reveal inline-flex items-center gap-3 bg-paper/95 backdrop-blur-sm rounded px-4 py-2.5 shadow-soft"
          style={{ animationDelay: "320ms" }}
        >
          <span className="relative inline-flex">
            <span className="inline-block w-2 h-2 rounded-full bg-accent" />
            <span className="absolute inset-0 rounded-full bg-accent/50 animate-ping" />
          </span>
          <span className="text-caption text-ink">{t("badge")}</span>
          <span className="text-caption text-ink-40">·</span>
          <span className="text-caption text-ink-70">{t("badgeMeta")}</span>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-paper/60 text-caption flex flex-col items-center gap-1.5">
        <span className="h-8 w-px bg-paper/40" />
        <span className="tracking-[0.2em] uppercase">{t("scroll")}</span>
      </div>
    </section>
  );
}
