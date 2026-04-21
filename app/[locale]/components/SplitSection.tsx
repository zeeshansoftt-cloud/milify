import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  id?: string;
  imageSide: "left" | "right";
  kicker: string;
  title: string;
  body: ReactNode;
  bullets?: string[];
  image: { src: string; alt: string; ratio?: "4/5" | "3/2" | "1/1"; caption?: string };
  cta?: { href: string; label: string };
};

export function SplitSection({ id, imageSide, kicker, title, body, bullets, image, cta }: Props) {
  const ratio = image.ratio ?? "4/5";
  const ratioClass = ratio === "4/5" ? "aspect-[4/5]" : ratio === "3/2" ? "aspect-[3/2]" : "aspect-square";

  const textOrderLg = imageSide === "right" ? "lg:order-1" : "lg:order-2";
  const imageOrderLg = imageSide === "right" ? "lg:order-2" : "lg:order-1";

  return (
    <section id={id} className="section">
      <div className="container">
        <div className="grid grid-cols-12 gap-x-8 gap-y-10 items-center">
          <div className={`col-span-12 lg:col-span-6 ${textOrderLg}`}>
            <div className="max-w-[520px]">
              <p className="kicker mb-5">{kicker}</p>
              <h2 className="text-h1">{title}</h2>
              <div className="mt-6 text-body-lg text-ink-70">{body}</div>
              {bullets && bullets.length > 0 && (
                <ul className="mt-8 space-y-3">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-body text-ink">
                      <Check />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              {cta && (
                <div className="mt-10">
                  <Link href={cta.href} className="btn-primary">
                    {cta.label}
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className={`col-span-12 lg:col-span-6 ${imageOrderLg}`}>
            <div className={`relative ${ratioClass} w-full overflow-hidden rounded`}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
              {image.caption && (
                <>
                  <div
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(20,21,25,0) 55%, rgba(20,21,25,0.55) 100%)",
                    }}
                  />
                  <div className="absolute left-5 bottom-5 right-5">
                    <div className="inline-flex items-center gap-2 bg-paper/95 rounded px-3 py-1.5 text-caption text-ink">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent" />
                      {image.caption}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Check() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className="mt-1 flex-shrink-0"
    >
      <circle cx="10" cy="10" r="9.25" stroke="#14594A" strokeWidth="1.5" />
      <path
        d="M6 10.5L8.75 13L14 7.5"
        stroke="#14594A"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
