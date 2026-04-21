import Image from "next/image";
import { getTranslations } from "next-intl/server";

const moduleThumbs = [
  {
    src: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&q=80&auto=format&fit=crop",
    alt: "",
  },
  {
    src: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80&auto=format&fit=crop",
    alt: "",
  },
  {
    src: "https://images.unsplash.com/photo-1529390079861-591de354faf5?w=600&q=80&auto=format&fit=crop",
    alt: "",
  },
];

export async function Modules() {
  const t = await getTranslations("modules");
  const items = (t.raw("items") as Array<{ title: string; desc: string }>) ?? [];

  return (
    <section id="modules" className="section bg-paper">
      <div className="container">
        <div className="grid grid-cols-12 gap-x-8 gap-y-12">
          <div className="col-span-12 lg:col-span-5">
            <p className="kicker mb-5">{t("kicker")}</p>
            <h2 className="text-h1">{t("title")}</h2>
            <p className="mt-6 text-body-lg text-ink-70 max-w-prose">{t("body")}</p>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <ul className="divide-y divide-rule border-y border-rule">
              {items.map((it, i) => {
                const thumb = moduleThumbs[i] ?? moduleThumbs[0];
                return (
                  <li
                    key={it.title}
                    className="grid grid-cols-[auto_1fr_auto] gap-x-6 py-7 items-start group"
                  >
                    <div className="font-display text-caption text-ink-40 pt-1">0{i + 1}</div>
                    <div>
                      <h3 className="text-h2 font-display">{it.title}</h3>
                      <p className="mt-2 text-body text-ink-70 max-w-[52ch]">{it.desc}</p>
                    </div>
                    <div className="hidden md:block relative w-[140px] aspect-square rounded overflow-hidden ring-1 ring-rule">
                      <Image
                        src={thumb.src}
                        alt={thumb.alt}
                        fill
                        sizes="140px"
                        className="object-cover transition-transform duration-700 ease-out-soft group-hover:scale-[1.04]"
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
