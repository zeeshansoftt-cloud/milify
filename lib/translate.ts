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
  return lang.trim().toLowerCase();
}

function shortCode(lang: string): string {
  return normalizeLang(lang).split("-")[0];
}

export function deeplTargetCode(lang: string): string | null {
  const low = normalizeLang(lang);
  const withUsFallback = low === "en" ? "en-us" : low;
  if (DEEPL_SUPPORTED_TARGETS.has(withUsFallback)) return withUsFallback.toUpperCase();
  const short = shortCode(low);
  if (DEEPL_SUPPORTED_TARGETS.has(short)) return short.toUpperCase();
  return null;
}

export async function translate(
  text: string,
  targetLang: string,
  sourceLang?: string
): Promise<TranslateResult> {
  const clean = text?.trim();
  if (!clean) return { text: "", translated: false };

  const target = shortCode(targetLang);
  const source = sourceLang ? shortCode(sourceLang) : undefined;
  if (!target || target === source) return { text, translated: false };

  if (process.env.DEEPL_API_KEY) {
    const viaDeepl = await translateViaDeepL(text, targetLang, sourceLang);
    if (viaDeepl.translated) return viaDeepl;
  }

  return translateViaMyMemory(text, target, source);
}

export function isTranslationConfigured(): boolean {
  return true;
}

export function isDeeplConfigured(): boolean {
  return Boolean(process.env.DEEPL_API_KEY);
}

async function translateViaDeepL(
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
    const res = await fetchWithTimeout(`${host}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    }, 8000);
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

async function translateViaMyMemory(
  text: string,
  target: string,
  source: string | undefined
): Promise<TranslateResult> {
  const chunks = splitForMyMemory(text);
  const effectiveSource = source || "auto";

  try {
    const translated: string[] = [];
    let detected: string | undefined;

    for (const chunk of chunks) {
      const out = await myMemoryOnce(chunk, effectiveSource, target);
      if (!out.translated) return { text, translated: false };
      translated.push(out.text);
      if (out.detectedSource && !detected) detected = out.detectedSource;
    }

    return {
      text: translated.join(""),
      translated: true,
      detectedSource: detected,
    };
  } catch {
    return { text, translated: false };
  }
}

type MyMemoryResponse = {
  responseStatus: number | string;
  responseDetails?: string;
  responseData?: { translatedText?: string; match?: number };
  matches?: { segment?: string; translation?: string; source?: string }[];
};

async function myMemoryOnce(
  text: string,
  source: string,
  target: string
): Promise<TranslateResult> {
  const langpair = source === "auto" ? `${detectStub(text)}|${target}` : `${source}|${target}`;
  const params = new URLSearchParams({
    q: text,
    langpair,
  });
  const email = process.env.TRANSLATE_EMAIL?.trim();
  if (email) params.set("de", email);

  const url = `https://api.mymemory.translated.net/get?${params.toString()}`;
  const res = await fetchWithTimeout(url, { cache: "no-store" }, 8000);
  if (!res.ok) return { text, translated: false };

  const data = (await res.json()) as MyMemoryResponse;
  const status =
    typeof data.responseStatus === "string"
      ? parseInt(data.responseStatus, 10)
      : data.responseStatus;
  const raw = data.responseData?.translatedText?.trim() ?? "";

  if (status !== 200 || !raw) return { text, translated: false };
  if (looksLikeMyMemoryError(raw, data.responseDetails)) {
    return { text, translated: false };
  }

  let detected: string | undefined;
  if (source === "auto") {
    const match = data.matches?.find((m) => m.source && m.source !== target);
    if (match?.source) detected = match.source.split("-")[0].toLowerCase();
  }

  return { text: raw, translated: true, detectedSource: detected };
}

function looksLikeMyMemoryError(text: string, details?: string): boolean {
  const t = text.toUpperCase();
  if (details && /INVALID|ERROR|NOT\s+SUPPORTED|SELECT/i.test(details)) return true;
  if (
    t.startsWith("PLEASE SELECT TWO") ||
    t.startsWith("INVALID") ||
    t.includes("MYMEMORY WARNING") ||
    t.includes("QUOTA EXCEEDED")
  ) {
    return true;
  }
  return false;
}

/**
 * MyMemory accepts up to 500 characters per `q`. Split on sentence/newline
 * boundaries when possible so recombined output reads naturally.
 */
function splitForMyMemory(text: string, max = 480): string[] {
  if (text.length <= max) return [text];

  const pieces: string[] = [];
  const sentences = text.split(/(?<=[.!?\n])\s+/g);
  let buf = "";
  for (const s of sentences) {
    if ((buf + (buf ? " " : "") + s).length > max) {
      if (buf) pieces.push(buf);
      if (s.length > max) {
        for (let i = 0; i < s.length; i += max) pieces.push(s.slice(i, i + max));
        buf = "";
      } else {
        buf = s;
      }
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  }
  if (buf) pieces.push(buf);
  return pieces;
}

/**
 * MyMemory requires a source language in `langpair`. When we don't have one,
 * fall back to Swedish — that's the app's authoring language. If the caller
 * already detected a different source, they pass it in.
 */
function detectStub(_text: string): string {
  return "sv";
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}
