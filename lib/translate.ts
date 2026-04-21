import "server-only";

export type TranslateResult = {
  text: string;
  translated: boolean;
  detectedSource?: string;
};

const DEEPL_SUPPORTED_TARGETS = new Set([
  "bg", "cs", "da", "de", "el", "en", "en-gb", "en-us", "es", "et", "fi", "fr", "hu",
  "id", "it", "ja", "ko", "lt", "lv", "nb", "nl", "pl", "pt", "pt-br", "pt-pt", "ro",
  "ru", "sk", "sl", "sv", "tr", "uk", "zh", "ar",
]);

export function normalizeLang(lang: string | null | undefined): string {
  if (!lang) return "en";
  const low = lang.toLowerCase();
  if (low === "en") return "en-us";
  return low;
}

export function deeplTargetCode(lang: string): string | null {
  const low = normalizeLang(lang);
  if (DEEPL_SUPPORTED_TARGETS.has(low)) return low.toUpperCase();
  const short = low.split("-")[0];
  if (DEEPL_SUPPORTED_TARGETS.has(short)) return short.toUpperCase();
  return null;
}

export async function translate(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<TranslateResult> {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) return { text, translated: false };

  const target = deeplTargetCode(targetLang);
  if (!target) return { text, translated: false };

  const host = process.env.DEEPL_API_HOST?.trim() || "https://api-free.deepl.com";

  const params = new URLSearchParams();
  params.append("text", text);
  params.append("target_lang", target);
  if (sourceLang) {
    const src = deeplTargetCode(sourceLang);
    if (src) params.append("source_lang", src.split("-")[0]);
  }

  try {
    const res = await fetch(`${host}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });
    if (!res.ok) return { text, translated: false };
    const data = (await res.json()) as {
      translations?: { text: string; detected_source_language?: string }[];
    };
    const first = data.translations?.[0];
    if (!first) return { text, translated: false };
    return {
      text: first.text,
      translated: true,
      detectedSource: first.detected_source_language?.toLowerCase(),
    };
  } catch {
    return { text, translated: false };
  }
}

export function isDeeplConfigured(): boolean {
  return Boolean(process.env.DEEPL_API_KEY);
}
