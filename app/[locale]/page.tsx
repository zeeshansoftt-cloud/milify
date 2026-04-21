import { getTranslations, setRequestLocale } from "next-intl/server";
import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { SplitSection } from "./components/SplitSection";
import { HowItWorks } from "./components/HowItWorks";
import { Modules } from "./components/Modules";
import { Proof } from "./components/Proof";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const why = await getTranslations("why");
  const trust = await getTranslations("trust");

  return (
    <>
      <Nav locale={locale} />
      <main>
        <Hero locale={locale} />

        <SplitSection
          id="why"
          imageSide="left"
          kicker={why("kicker")}
          title={why("title")}
          body={<p>{why("body")}</p>}
          bullets={why.raw("bullets") as string[]}
          image={{
            src: "https://images.unsplash.com/photo-1606836591695-4d58a73eba1e?w=1400&q=80&auto=format&fit=crop",
            alt: "",
            ratio: "4/5",
            caption: why("imageCaption"),
          }}
        />

        <HowItWorks />

        <Modules />

        <SplitSection
          id="trust"
          imageSide="left"
          kicker={trust("kicker")}
          title={trust("title")}
          body={<p>{trust("body")}</p>}
          bullets={trust.raw("bullets") as string[]}
          image={{
            src: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1400&q=80&auto=format&fit=crop",
            alt: "",
            ratio: "4/5",
            caption: trust("imageCaption"),
          }}
        />

        <Proof />

        <Contact />
      </main>
      <Footer />
    </>
  );
}
