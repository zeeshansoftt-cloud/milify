"use client";

import { useState } from "react";

type Labels = {
  name: string;
  email: string;
  org: string;
  message: string;
  send: string;
  success: string;
  error: string;
};

export function ContactForm({ labels }: { labels: Labels }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("sending");
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        body: JSON.stringify(Object.fromEntries(fd.entries())),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("fail");
      (e.target as HTMLFormElement).reset();
      setState("sent");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="label">
            {labels.name}
          </label>
          <input id="name" name="name" required className="input" autoComplete="name" />
        </div>
        <div>
          <label htmlFor="email" className="label">
            {labels.email}
          </label>
          <input id="email" name="email" type="email" required className="input" autoComplete="email" />
        </div>
      </div>
      <div>
        <label htmlFor="org" className="label">
          {labels.org}
        </label>
        <input id="org" name="org" className="input" autoComplete="organization" />
      </div>
      <div>
        <label htmlFor="message" className="label">
          {labels.message}
        </label>
        <textarea id="message" name="message" required className="textarea" rows={5} />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={state === "sending"} className="btn-primary">
          {labels.send}
        </button>
        {state === "sent" && <span className="text-small text-accent-deep">{labels.success}</span>}
        {state === "error" && <span className="text-small text-alert">{labels.error}</span>}
      </div>
    </form>
  );
}
