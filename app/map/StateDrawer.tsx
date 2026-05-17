"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X, AlertTriangle } from "lucide-react";
import { StatusPill } from "@/components/Pill";
import { Button } from "@/components/Button";
import { PROCEDURE_KEYS, PROCEDURE_LABELS } from "@/data/care_status";
import type { ProcedureKey, StateCareData } from "@/types";

export function StateDrawer({
  state,
  onClose,
}: {
  state: StateCareData | undefined;
  onClose: () => void;
}) {
  // Allow Esc to close.
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [onClose]);

  if (!state) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/30 transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <aside className="w-full max-w-[480px] glass-strong h-full overflow-y-auto animate-[slidein_0.18s_ease-out]">
        <div className="sticky top-0 glass-nav px-7 py-5 flex items-center justify-between">
          <h2 className="text-subsection">
            {state.state_name}
            <span className="ml-2 text-ink-secondary text-meta font-normal">
              {state.state_code}
            </span>
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-btn hover:bg-surface-inset"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-7 py-6 space-y-4">
          {PROCEDURE_KEYS.map((p) => (
            <ProcedureRow key={p} procedure={p} state={state} />
          ))}
        </div>

        <div className="px-7 pb-6">
          <div className="rounded-card bg-status-restricted/10 p-5 flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-status-restricted mt-0.5 shrink-0" />
            <div className="text-body leading-relaxed">
              <div className="font-medium">Verify Before Acting</div>
              <p className="text-ink-secondary mt-1">
                The law in some states changes weekly. Before making medical or
                travel decisions, contact{" "}
                <a
                  href="https://www.lambdalegal.org/help"
                  target="_blank"
                  rel="noreferrer"
                  className="text-ink-primary underline-offset-4 hover:underline"
                >
                  Lambda Legal&apos;s Help Desk
                </a>
                .
              </p>
            </div>
          </div>
        </div>

        {state.related_orgs && state.related_orgs.length > 0 ? (
          <div className="px-7 pb-10">
            <h3 className="text-card mb-3">Related Organizations</h3>
            <ul className="space-y-2">
              {state.related_orgs.map((o) => (
                <li key={o.url}>
                  <a
                    href={o.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-ink-primary underline-offset-4 hover:underline"
                  >
                    {o.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="px-7 pb-10 text-meta text-ink-secondary">
            Related organizations: coming soon.
          </div>
        )}
      </aside>
      <style jsx global>{`
        @keyframes slidein {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}

function ProcedureRow({
  procedure,
  state,
}: {
  procedure: ProcedureKey;
  state: StateCareData;
}) {
  const [open, setOpen] = useState(false);
  const data = state.procedures[procedure];
  return (
    <div className="rounded-btn border border-divider/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex flex-col">
          <span className="text-body font-medium">
            {PROCEDURE_LABELS[procedure]}
          </span>
          <span className="text-meta text-ink-secondary">
            Updated {data.last_updated}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={data.status} />
          <ChevronDown
            className={`h-4 w-4 text-ink-secondary transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 text-meta text-ink-secondary border-t divider-soft pt-3 space-y-3">
          {data.notes && <p>{data.notes}</p>}
          {data.sources.length > 0 && (
            <div>
              <div className="text-ink-primary text-meta uppercase tracking-[0.12em] mb-1.5">
                Sources
              </div>
              <ul className="space-y-1">
                {data.sources.map((s) => (
                  <li key={s} className="break-all">
                    <a
                      href={s}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ink-primary underline-offset-4 hover:underline"
                    >
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
