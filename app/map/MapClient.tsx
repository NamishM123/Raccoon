"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, Search } from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { StatusPill, statusLabel } from "@/components/Pill";
import { AuroraOverlay } from "@/components/ui/aurora-background";
import {
  CARE_STATUS_BY_CODE,
  PROCEDURE_KEYS,
  PROCEDURE_LABELS,
  getLastDataUpdate,
} from "@/data/care_status";
import {
  INSURANCE_KEYS,
  INSURANCE_LABELS,
  INSURANCE_BLURB,
  getCombinedStatus,
  type InsuranceKey,
} from "@/data/insurance_coverage";
import { cn } from "@/lib/cn";
import type { CareStatus, ProcedureKey } from "@/types";
import { USMap } from "./USMap";
import { StateDrawer } from "./StateDrawer";

const MATCHING_STATUSES: ReadonlySet<CareStatus> = new Set<CareStatus>([
  "PROTECTED",
  "LEGAL",
]);

function Typeahead<T extends string>({
  value,
  options,
  labels,
  placeholder,
  onChange,
}: {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  placeholder: string;
  onChange: (next: T) => void;
}) {
  const [query, setQuery] = useState<string>(labels[value]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setQuery(labels[value]);
  }, [value, labels]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery(labels[value]);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [labels, value]);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q || q === labels[value].toLowerCase()) return options;
    return options.filter((o) => labels[o].toLowerCase().includes(q));
  }, [q, options, labels, value]);

  function commit(next: T) {
    onChange(next);
    setQuery(labels[next]);
    setOpen(false);
    inputRef.current?.blur();
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2 rounded-btn bg-white/80 ring-1 ring-inset ring-[#E5E5EA] focus-within:ring-accent px-3 py-2">
        <Search className="h-4 w-4 text-ink-secondary" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true);
            setActiveIndex(0);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const pick = filtered[activeIndex];
              if (pick) commit(pick);
            } else if (e.key === "Escape") {
              setOpen(false);
              setQuery(labels[value]);
              inputRef.current?.blur();
            }
          }}
          className="w-full bg-transparent text-body text-ink-primary placeholder:text-ink-secondary outline-none"
        />
      </div>
      {open && filtered.length > 0 && (
        <ul className="absolute z-30 mt-2 w-full max-h-64 overflow-auto rounded-card bg-white shadow-card ring-1 ring-inset ring-[#E5E5EA] py-1">
          {filtered.map((o, i) => (
            <li key={o}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(o);
                }}
                className={cn(
                  "w-full text-left px-3 py-2 text-meta",
                  i === activeIndex
                    ? "bg-accent text-white"
                    : "text-ink-primary hover:bg-surface-inset"
                )}
              >
                {labels[o]}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && filtered.length === 0 && (
        <div className="absolute z-30 mt-2 w-full rounded-card bg-white shadow-card ring-1 ring-inset ring-[#E5E5EA] px-3 py-2 text-meta text-ink-secondary">
          No matches
        </div>
      )}
    </div>
  );
}

const STATUS_LEGEND: Array<{ status: CareStatus; description: string }> = [
  {
    status: "PROTECTED",
    description: "Affirmative state law or constitutional protection.",
  },
  { status: "LEGAL", description: "No active restriction; standard access." },
  {
    status: "RESTRICTED",
    description: "Age limits, parental consent, or coverage carveouts.",
  },
  { status: "BANNED", description: "Statutory or regulatory ban currently in force." },
  {
    status: "IN_LITIGATION",
    description: "Status is contested in court; check the date of last update.",
  },
];

export function MapClient() {
  const [procedure, setProcedure] = useState<ProcedureKey>("hrt_adult");
  const [insurance, setInsurance] = useState<InsuranceKey>("employer");
  const [activeState, setActiveState] = useState<string | null>(null);

  const lastUpdate = useMemo(() => getLastDataUpdate(), []);

  const matches = useMemo(() => {
    const list: Array<{ code: string; name: string; status: CareStatus }> = [];
    for (const code of Object.keys(CARE_STATUS_BY_CODE)) {
      const status = getCombinedStatus(code, insurance, procedure);
      if (MATCHING_STATUSES.has(status)) {
        list.push({
          code,
          name: CARE_STATUS_BY_CODE[code].state_name,
          status,
        });
      }
    }
    list.sort((a, b) => {
      if (a.status !== b.status) return a.status === "PROTECTED" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [procedure, insurance]);

  const matchingCodes = useMemo(
    () => new Set(matches.map((m) => m.code)),
    [matches]
  );

  return (
    <div className="page-ocean">
      <AuroraOverlay variant="violet" />
      <PageHero
        title="Where Your State Stands On Gender Affirming Care"
        description="Pick a procedure and your insurance. The map recolors to show which states will actually cover the care."
      />
      <Container className="pb-16 relative">
      <div className="glass rounded-card p-7 mb-8 flex items-start gap-4">
        <CalendarClock className="h-7 w-7 shrink-0 text-sea-deep" />
        <div>
          <h2 className="text-subsection">Best Effort Snapshot</h2>
          <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
            State buckets reflect patterns reported by HRC, MAP, Lambda Legal,
            and KFF across 2024 and 2025. This isn't realtime legal
            adjudication, and the law in some states changes weekly. Always{" "}
            <a
              href="https://www.lambdalegal.org/help"
              target="_blank"
              rel="noreferrer"
              className="text-ink-primary underline-offset-4 hover:underline"
            >
              verify with Lambda Legal&apos;s Help Desk
            </a>{" "}
            before acting.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="glass rounded-card p-6 mb-8">
        <div className="flex flex-col gap-4">
          <p className="text-meta text-ink-secondary leading-relaxed">
            Type your procedure and insurance — matching states stay lit on the
            map, and we list them below.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-meta uppercase tracking-[0.12em] text-ink-secondary mb-2">
                Procedure
              </label>
              <Typeahead<ProcedureKey>
                value={procedure}
                options={PROCEDURE_KEYS}
                labels={PROCEDURE_LABELS}
                placeholder="e.g. HRT, surgery, puberty blockers"
                onChange={setProcedure}
              />
            </div>
            <div>
              <label className="block text-meta uppercase tracking-[0.12em] text-ink-secondary mb-2">
                Insurance
              </label>
              <Typeahead<InsuranceKey>
                value={insurance}
                options={INSURANCE_KEYS}
                labels={INSURANCE_LABELS}
                placeholder="e.g. employer, Medicaid, marketplace"
                onChange={setInsurance}
              />
            </div>
          </div>
          <p className="text-meta text-ink-secondary leading-relaxed">
            {INSURANCE_BLURB[insurance]}
          </p>
          <div className="pt-3 border-t divider-soft text-meta text-ink-secondary">
            Last comprehensive update:{" "}
            <span className="text-ink-primary font-medium">{lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="glass rounded-card p-4 md:p-8 mb-8">
        <USMap
          procedure={procedure}
          insurance={insurance}
          onSelect={(code) => setActiveState(code)}
          matchingStates={matchingCodes}
        />
      </div>

      {/* Matching states */}
      <div className="glass rounded-card p-7 mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
          <h2 className="text-subsection">
            States that work for {PROCEDURE_LABELS[procedure]} on{" "}
            {INSURANCE_LABELS[insurance]}
          </h2>
          <span className="text-meta text-ink-secondary">
            {matches.length} {matches.length === 1 ? "state" : "states"}
          </span>
        </div>
        {matches.length === 0 ? (
          <p className="text-body text-ink-secondary leading-relaxed">
            No states currently show clean coverage for this combination. Try a
            different procedure or insurance, or check the map for restricted /
            in-litigation states.
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <li key={m.code}>
                <button
                  type="button"
                  onClick={() => setActiveState(m.code)}
                  className="w-full flex items-center justify-between gap-3 rounded-btn bg-white/80 hover:bg-white px-3 py-2 ring-1 ring-inset ring-[#E5E5EA] transition-colors"
                >
                  <span className="text-body text-ink-primary text-left">
                    {m.name}
                  </span>
                  <span className="shrink-0 inline-flex items-center gap-1.5 text-meta text-ink-secondary">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        m.status === "PROTECTED"
                          ? "bg-status-protected"
                          : "bg-status-legal"
                      )}
                    />
                    {statusLabel(m.status)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Legend + methodology */}
      <section className="grid gap-6 lg:grid-cols-2 mb-8">
        <div className="glass rounded-card p-7">
          <h2 className="text-subsection mb-4">
            Color Legend
          </h2>
          <div className="grid grid-cols-[max-content_1fr] items-center gap-x-4 gap-y-3">
            {STATUS_LEGEND.map((l) => (
              <Fragment key={l.status}>
                <StatusPill status={l.status} />
                <span className="text-meta text-ink-secondary">
                  {l.description}
                </span>
              </Fragment>
            ))}
          </div>
        </div>

        <div className="glass rounded-card p-7">
          <h2 className="text-subsection mb-4">
            How We Source This Data
          </h2>
          <div className="text-body text-ink-primary leading-relaxed space-y-3">
            <p>
              Care Map combines weekly snapshots from the Movement Advancement
              Project, Lambda Legal&apos;s case tracker, KFF, and direct reads
              of state legislation. Insurance posture (Medicaid, Marketplace,
              employer, Medicare) is layered on top from MAP&apos;s
              Medicaid coverage map and state insurance non-discrimination
              statutes. Each cell&apos;s color is the worse of the procedure
              status and your insurance&apos;s posture in that state.
            </p>
            <p className="text-ink-secondary">
              The law in some states changes faster than we can rescrape.{" "}
              <a
                className="text-ink-primary underline-offset-4 hover:underline"
                href="https://www.lambdalegal.org/help"
                target="_blank"
                rel="noreferrer"
              >
                Verify with Lambda Legal&apos;s Help Desk
              </a>{" "}
              before acting on anything you see here.
            </p>
          </div>
        </div>
      </section>

      {activeState && (
        <StateDrawer
          state={CARE_STATUS_BY_CODE[activeState]}
          insurance={insurance}
          onClose={() => setActiveState(null)}
        />
      )}
      </Container>
    </div>
  );
}
