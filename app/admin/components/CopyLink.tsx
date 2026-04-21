"use client";

import { useState } from "react";

type Tone = "light" | "dark";

export function CopyLink({
  url,
  tone = "light",
  label = "Kopiera länk",
  copiedLabel = "Kopierat",
}: {
  url: string;
  tone?: Tone;
  label?: string;
  copiedLabel?: string;
}) {
  const [copied, setCopied] = useState(false);
  const cls =
    tone === "dark"
      ? "btn bg-paper text-ink hover:bg-white"
      : "btn-secondary";
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {}
      }}
      className={cls}
    >
      {copied ? copiedLabel : label}
    </button>
  );
}
