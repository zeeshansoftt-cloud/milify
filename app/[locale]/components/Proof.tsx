import Image from "next/image";
import { getTranslations } from "next-intl/server";

export async function Proof() {
  const t = await getTranslations("proof");
  const items = (t.raw("items") as Array<{ value: string; label: string }>) ?? [];
  return (
    <section className="section relative isolate overflow-hidden bg-ink text-paper">
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1553413077-190dd305871c?w=2000&q=80&auto=format&fit=crop"
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,21,25,0.85) 0%, rgba(20,21,25,0.7) 50%, rgba(20,21,25,0.95) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(closest-side, #14594A 0%, transparent 70%)" }}
        />
      </div>

      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 md:gap-x-12">
          {items.map((it, i) => (
            <div key={it.label} className="relative">
              <div className="font-display text-[clamp(48px,6vw,80px)] leading-none tracking-tight text-paper">
                {it.value}
              </div>
              <div className="mt-4 text-small text-paper/70 max-w-[26ch]">{it.label}</div>
              {i < items.length - 1 && (
                <div className="hidden md:block absolute top-2 -right-6 h-16 w-px bg-paper/15" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
