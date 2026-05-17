"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ExternalLink, FileText, Loader2, X, AlertTriangle, MessageCircle, ShieldCheck, ArrowUp, BookOpen } from "lucide-react";
import { StatusPill } from "@/components/Pill";
import { Button } from "@/components/Button";
import { PROCEDURE_KEYS, PROCEDURE_LABELS } from "@/data/care_status";
import {
  getCombinedStatus,
  getCombinedRationale,
  INSURANCE_LABELS,
  type InsuranceKey,
} from "@/data/insurance_coverage";
import {
  VERIFIED_SOURCES_BY_PROCEDURE,
  REDDIT_QUERIES_BY_PROCEDURE,
  SUMMARY_BY_PROCEDURE,
  FALLBACK_REDDIT_BY_PROCEDURE,
  type SampleReview,
} from "@/data/verified_sources";
import type { ProcedureKey, StateCareData } from "@/types";

interface RedditReview {
  id: string;
  title: string;
  snippet: string;
  author: string;
  subreddit: string;
  url: string;
  score: number;
  num_comments: number;
  created_utc: number;
}

export function StateDrawer({
  state,
  insurance,
  onClose,
}: {
  state: StateCareData | undefined;
  insurance: InsuranceKey;
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

        <div className="px-7 pt-5">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
            Coverage shown for
          </div>
          <div className="text-card font-medium mt-0.5">
            {INSURANCE_LABELS[insurance]}
          </div>
        </div>

        <div className="px-7 py-5 space-y-4">
          {PROCEDURE_KEYS.map((p) => (
            <ProcedureRow
              key={p}
              procedure={p}
              state={state}
              insurance={insurance}
            />
          ))}
        </div>

        <ActiveBills stateCode={state.state_code} />

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

// ── Live legislation from Trans Legislation Tracker ───────────────────────────

interface Bill {
  id: string; state: string; bill_number: string;
  title: string; status: string; category: string;
  url: string; last_action_date: string;
}

const STATUS_COLORS: Record<string, string> = {
  passed:  "bg-red-100 text-red-700",
  failed:  "bg-emerald-100 text-emerald-700",
  dead:    "bg-emerald-100 text-emerald-700",
  carried: "bg-amber-100 text-amber-700",
  introduced: "bg-sky-100 text-sky-700",
  referred:   "bg-sky-100 text-sky-700",
};

function billColor(status: string) {
  const key = status.toLowerCase();
  return Object.entries(STATUS_COLORS).find(([k]) => key.includes(k))?.[1]
    ?? "bg-surface-inset text-ink-secondary";
}

function ActiveBills({ stateCode }: { stateCode: string }) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    setBills([]); setLoaded(false);
    setBusy(true);
    fetch(`/api/legislation?state=${stateCode}`)
      .then(r => r.json())
      .then(d => { setBills(d.bills ?? []); setLoaded(true); })
      .catch(() => setLoaded(true))
      .finally(() => setBusy(false));
  }, [stateCode]);

  return (
    <div className="px-7 pb-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 mb-3"
      >
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand" />
          <h3 className="text-card font-bold text-ink-primary">Active Legislation</h3>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-secondary" />}
          {loaded && (
            <span className="text-[11px] font-semibold text-ink-secondary bg-surface-inset px-2 py-0.5 rounded-full">
              {bills.length}
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-ink-secondary transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          {loaded && bills.length === 0 && (
            <p className="text-meta text-ink-secondary">
              No active bills found for this state in the Trans Legislation Tracker.
            </p>
          )}
          <div className="space-y-2">
            {bills.map(b => (
              <div key={b.id} className="rounded-xl border border-divider bg-surface-inset/40 px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-[11px] font-bold text-ink-secondary">{b.bill_number}</span>
                      <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${billColor(b.status)}`}>
                        {b.status}
                      </span>
                      {b.category && (
                        <span className="text-[10px] text-ink-secondary">{b.category}</span>
                      )}
                    </div>
                    <p className="text-meta text-ink-primary leading-snug">{b.title}</p>
                    {b.last_action_date && (
                      <p className="text-[11px] text-ink-secondary mt-1">
                        Last action: {b.last_action_date}
                      </p>
                    )}
                  </div>
                  {b.url && (
                    <a href={b.url} target="_blank" rel="noopener noreferrer"
                      className="shrink-0 text-brand hover:text-brand/70 transition-colors mt-0.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
          {loaded && bills.length > 0 && (
            <p className="mt-2 text-[11px] text-ink-secondary">
              Source: Trans Legislation Tracker · Refreshed hourly
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ProcedureRow({
  procedure,
  state,
  insurance,
}: {
  procedure: ProcedureKey;
  state: StateCareData;
  insurance: InsuranceKey;
}) {
  const [open, setOpen] = useState(false);
  const data = state.procedures[procedure];
  const combined = getCombinedStatus(state.state_code, insurance, procedure);
  const rationale = getCombinedRationale(state.state_code, insurance, procedure);
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
          <StatusPill status={combined} />
          <ChevronDown
            className={`h-4 w-4 text-ink-secondary transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 text-meta text-ink-secondary border-t divider-soft pt-3 space-y-3">
          <ClinicalSummary procedure={procedure} />

          {combined !== data.status && (
            <div className="flex items-center gap-2 text-ink-primary">
              <span>Procedure legality:</span>
              <StatusPill status={data.status} />
            </div>
          )}
          {rationale && (
            <p>
              <span className="text-ink-primary font-medium">
                {INSURANCE_LABELS[insurance]}:
              </span>{" "}
              {rationale}
            </p>
          )}
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

          <RedditReviews procedure={procedure} />
          <VerifiedSources procedure={procedure} />
        </div>
      )}
    </div>
  );
}

function timeAgo(unixSeconds: number): string {
  if (!unixSeconds) return "";
  const diffSec = Math.max(1, Math.floor(Date.now() / 1000 - unixSeconds));
  const units: Array<[number, string]> = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [30, "d"],
    [12, "mo"],
    [Number.POSITIVE_INFINITY, "y"],
  ];
  let value = diffSec;
  let label = "s";
  for (const [step, l] of units) {
    if (value < step) {
      label = l;
      break;
    }
    value = Math.floor(value / step);
    label = l;
  }
  return `${value}${label} ago`;
}

function ClinicalSummary({ procedure }: { procedure: ProcedureKey }) {
  const summary = SUMMARY_BY_PROCEDURE[procedure];
  if (!summary) return null;
  return (
    <div className="rounded-btn border border-divider/60 bg-accent/5 px-3 py-3">
      <div className="flex items-center gap-2 mb-1.5">
        <BookOpen className="h-4 w-4 text-accent" />
        <span className="text-ink-primary font-medium">
          What this procedure is
        </span>
      </div>
      <p className="text-meta text-ink-secondary leading-relaxed">{summary}</p>
      <p className="mt-1.5 text-[11px] text-ink-secondary">
        Synthesised from the verified sources below.
      </p>
    </div>
  );
}

function RedditReviews({ procedure }: { procedure: ProcedureKey }) {
  const [open, setOpen] = useState(false);
  const [posts, setPosts] = useState<RedditReview[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    if (!open || loaded || busy) return;
    setBusy(true);
    const queries = REDDIT_QUERIES_BY_PROCEDURE[procedure] ?? [];
    const params = queries
      .map((q) => `q=${encodeURIComponent(q)}`)
      .join("&");
    fetch(`/api/reddit?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const live: RedditReview[] = Array.isArray(d?.posts) ? d.posts : [];
        if (live.length > 0) {
          setPosts(live);
          setUsedFallback(false);
        } else {
          setUsedFallback(true);
        }
        setLoaded(true);
      })
      .catch(() => {
        setUsedFallback(true);
        setLoaded(true);
      })
      .finally(() => setBusy(false));
  }, [open, loaded, busy, procedure]);

  const fallback: SampleReview[] = FALLBACK_REDDIT_BY_PROCEDURE[procedure] ?? [];

  return (
    <div className="rounded-btn border border-divider/60 bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-[#FF4500]" />
          <span className="text-ink-primary font-medium">
            How it felt: patient reviews from Reddit
          </span>
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-secondary" />}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-ink-secondary transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 pt-1 space-y-2">
          {!usedFallback &&
            posts.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-btn border border-divider bg-white/70 hover:bg-white px-3 py-2 transition-colors"
              >
                <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                  <span className="font-bold text-[#FF4500]">r/{p.subreddit}</span>
                  <span>·</span>
                  <span>u/{p.author}</span>
                  {p.created_utc > 0 && (
                    <>
                      <span>·</span>
                      <span>{timeAgo(p.created_utc)}</span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-body text-ink-primary leading-snug">
                  {p.title}
                </p>
                {p.snippet && (
                  <p className="mt-1 text-meta text-ink-secondary leading-snug line-clamp-3">
                    {p.snippet}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-ink-secondary">
                  <span className="inline-flex items-center gap-0.5">
                    <ArrowUp className="h-3 w-3" />
                    {p.score}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <MessageCircle className="h-3 w-3" />
                    {p.num_comments}
                  </span>
                </div>
              </a>
            ))}

          {usedFallback && fallback.length > 0 && (
            <>
              {fallback.map((p, i) => (
                <div
                  key={`fb-${i}`}
                  className="rounded-btn border border-divider bg-white/70 px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-[11px] text-ink-secondary">
                    <span className="font-bold text-[#FF4500]">r/{p.subreddit}</span>
                    <span>·</span>
                    <span className="uppercase tracking-wide text-[10px] font-semibold bg-surface-inset text-ink-secondary px-1.5 py-0.5 rounded">
                      Sample
                    </span>
                  </div>
                  <p className="mt-1 text-body text-ink-primary leading-snug">
                    {p.title}
                  </p>
                  <p className="mt-1 text-meta text-ink-secondary leading-snug">
                    {p.snippet}
                  </p>
                </div>
              ))}
              <p className="text-[11px] text-ink-secondary">
                Reddit didn&apos;t return live posts (rate limited or blocked).
                These are representative community-style experiences: anecdotal, not medical advice.
              </p>
            </>
          )}

          {!usedFallback && loaded && posts.length > 0 && (
            <p className="text-[11px] text-ink-secondary">
              Source: Reddit public search. Anecdotes, not medical advice.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function VerifiedSources({ procedure }: { procedure: ProcedureKey }) {
  const [open, setOpen] = useState(false);
  const sources = VERIFIED_SOURCES_BY_PROCEDURE[procedure] ?? [];
  if (sources.length === 0) return null;

  return (
    <div className="rounded-btn border border-divider/60 bg-surface/60">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-status-protected" />
          <span className="text-ink-primary font-medium">
            Verified sources
          </span>
          <span className="text-[11px] font-semibold text-ink-secondary bg-surface-inset px-2 py-0.5 rounded-full">
            {sources.length}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-ink-secondary transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <ul className="px-3 pb-3 pt-1 space-y-2">
          {sources.map((s) => (
            <li
              key={s.url}
              className="rounded-btn border border-divider bg-white/70 px-3 py-2"
            >
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-body text-ink-primary font-medium underline-offset-4 hover:underline"
              >
                {s.title}
                <ExternalLink className="h-3 w-3" />
              </a>
              <div className="text-[11px] uppercase tracking-[0.1em] text-ink-secondary mt-0.5">
                {s.publisher}
              </div>
              {s.note && (
                <p className="mt-1 text-meta text-ink-secondary leading-snug">
                  {s.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
