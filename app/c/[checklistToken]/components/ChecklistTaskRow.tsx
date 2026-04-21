"use client";

import { useState, useTransition } from "react";
import { markTaskDone, undoTaskDone } from "../actions";

type Props = {
  checklistToken: string;
  task: {
    id: string;
    title: string;
    assigneeLabel: string;
  };
  completion:
    | {
        byName: string;
        at: string;
        note: string;
        mine: boolean;
      }
    | null;
};

export function ChecklistTaskRow({ checklistToken, task, completion }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState(completion?.note ?? "");
  const [pending, start] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  const done = !!completion;

  function handleToggle() {
    start(async () => {
      if (done) {
        await undoTaskDone(checklistToken, task.id);
      } else {
        await markTaskDone(checklistToken, task.id, note || undefined);
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 1500);
      }
    });
  }

  function handleNoteBlur() {
    if (!done) return;
    start(async () => {
      await markTaskDone(checklistToken, task.id, note);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    });
  }

  return (
    <li
      className={`bg-white border rounded transition-colors ${
        done ? "border-accent/30" : "border-rule"
      }`}
    >
      <div className="p-4 md:p-5 flex items-start gap-3">
        <button
          type="button"
          onClick={handleToggle}
          aria-pressed={done}
          disabled={pending}
          className={`mt-0.5 shrink-0 w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
            done
              ? "bg-accent border-accent text-paper"
              : "bg-white border-ink/20 hover:border-accent"
          } ${pending ? "opacity-50" : ""}`}
          aria-label={done ? "Ångra" : "Markera klar"}
        >
          {done ? (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M4 9.5L7.5 13L14 5.5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 text-left min-w-0"
          aria-expanded={expanded}
        >
          <div
            className={`font-display text-[19px] leading-snug ${
              done ? "text-ink-70 line-through decoration-1" : ""
            }`}
          >
            {task.title}
          </div>
          <div className="mt-1 text-caption text-ink-40 truncate">
            {task.assigneeLabel && <span>Ansvarig: {task.assigneeLabel}</span>}
            {task.assigneeLabel && completion && <span className="mx-1.5">·</span>}
            {completion && (
              <span className="text-ink-70">
                {completion.byName} · {new Date(completion.at).toLocaleString("sv-SE")}
              </span>
            )}
          </div>
        </button>

        <div className="shrink-0 text-caption text-ink-40 min-h-[1em]" aria-live="polite">
          {pending ? "Sparar…" : justSaved ? "Sparat" : ""}
        </div>
      </div>

      {expanded && (
        <div className="px-4 md:px-5 pb-4 md:pb-5 grid gap-3 border-t border-rule/70 pt-4 mt-1">
          <div>
            <label className="label" htmlFor={`note-${task.id}`}>
              Anteckning (valfritt)
            </label>
            <textarea
              id={`note-${task.id}`}
              className="textarea"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={handleNoteBlur}
              placeholder="T.ex. avvikelse eller observation"
            />
          </div>
          {done && completion && (
            <p className="text-caption text-ink-40">
              Klarmarkerad av {completion.byName},{" "}
              {new Date(completion.at).toLocaleString("sv-SE")}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
