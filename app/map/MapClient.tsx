"use client";

import { Fragment, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Pill, StatusPill, statusLabel } from "@/components/Pill";
import {
  CARE_STATUS,
  CARE_STATUS_BY_CODE,
  PROCEDURE_KEYS,
  PROCEDURE_LABELS,
  getLastDataUpdate,
} from "@/data/care_status";
import { CARE_CENTERS } from "@/data/care_centers";
import type { CareStatus, ProcedureKey } from "@/types";
import { USMap } from "./USMap";
import { StateDrawer } from "./StateDrawer";

const INSURANCE_FILTERS = [
  { id: "employer", label: "Employer" },
  { id: "marketplace", label: "Marketplace" },
  { id: "medicaid", label: "Medicaid" },
  { id: "medicare", label: "Medicare" },
  { id: "self_pay", label: "Self Pay" },
];

const STATUS_LEGEND: Array<{ status: CareStatus; description: string }> = [
  {
    status: "PROTECTED",
    description: "Affirmative state law or constitutional protection.",
  },
  { status: "LEGAL", description: "No active restriction; standard access." },
  {
    status: "RESTRICTED",
    description: "Age limits, parental consent, or coverage carve-outs.",
  },
  { status: "BANNED", description: "Statutory or regulatory ban currently in force." },
  {
    status: "IN_LITIGATION",
    description: "Status is contested in court; check the date of last update.",
  },
];

export function MapClient() {
  const [procedure, setProcedure] = useState<ProcedureKey>("hrt_adult");
  const [insurance, setInsurance] = useState<string>("employer");
  const [activeState, setActiveState] = useState<string | null>(null);
  const [showCenters, setShowCenters] = useState(true);

  const lastUpdate = useMemo(() => getLastDataUpdate(), []);

  const stats = useMemo(() => {
    const counts: Record<CareStatus, number> = {
      PROTECTED: 0,
      LEGAL: 0,
      RESTRICTED: 0,
      BANNED: 0,
      IN_LITIGATION: 0,
    };
    for (const s of CARE_STATUS) {
      counts[s.procedures[procedure].status]++;
    }
    const total = CARE_STATUS.length;
    const centersInProtective = CARE_CENTERS.filter((c) => {
      const status = CARE_STATUS_BY_CODE[c.state_code]?.procedures[procedure].status;
      return status === "PROTECTED" || status === "LEGAL";
    }).length;
    return { counts, total, centersInProtective };
  }, [procedure]);

  return (
    <div className="page-ocean">
      <PageHero
        eyebrow="Care Map"
        title="Where Your State Stands On Gender-Affirming Care."
        description="The current legal landscape for HRT, surgery, ID changes, and shield laws across all 50 states. Hover for a quick read, click a state for the full breakdown."
      />
      <Container className="pb-16 relative">
      <div className="glass rounded-card p-4 mb-8 flex items-start gap-3 text-meta text-ink-secondary leading-relaxed">
        <span className="mt-0.5 inline-block h-2 w-2 rounded-full bg-status-restricted shrink-0" />
        <div>
          <strong className="text-ink-primary">Best-effort snapshot.</strong>{" "}
          State buckets reflect patterns publicly reported by HRC, MAP, Lambda
          Legal, and KFF over 2024 and 2025. This is not a real-time legal
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
        </div>
      </div>

      {/* Filter bar */}
      <div className="glass rounded-card p-6 mb-8">
        <div className="flex flex-wrap items-start gap-6 lg:items-center lg:justify-between">
          <div className="flex flex-col gap-3 flex-1 min-w-0">
            <div>
              <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary mb-2">
                Procedure
              </div>
              <div className="flex flex-wrap gap-2">
                {PROCEDURE_KEYS.map((p) => (
                  <Pill
                    key={p}
                    onClick={() => setProcedure(p)}
                    selected={procedure === p}
                  >
                    {PROCEDURE_LABELS[p]}
                  </Pill>
                ))}
              </div>
            </div>
            <div>
              <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary mb-2">
                Insurance
              </div>
              <div className="flex flex-wrap gap-2">
                {INSURANCE_FILTERS.map((i) => (
                  <Pill
                    key={i.id}
                    onClick={() => setInsurance(i.id)}
                    selected={insurance === i.id}
                  >
                    {i.label}
                  </Pill>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 shrink-0 lg:items-end">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCenters}
                onChange={(e) => setShowCenters(e.target.checked)}
                className="h-4 w-4 rounded border-divider"
              />
              <span className="inline-flex items-center gap-1.5 text-meta text-ink-primary">
                <MapPin className="h-3.5 w-3.5 text-[#1D70B8]" />
                Show care centers
              </span>
            </label>
            <div className="text-meta text-ink-secondary">
              Last comprehensive update:{" "}
              <span className="text-ink-primary">{lastUpdate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="glass rounded-card p-4 md:p-8 mb-8">
        <USMap
          procedure={procedure}
          onSelect={(code) => setActiveState(code)}
          showCenters={showCenters}
        />
      </div>

      {/* Statistics */}
      <section className="glass rounded-card p-7 mb-8">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-5">
          <h2 className="text-subsection">
            By the numbers ·{" "}
            <span className="text-ink-secondary font-normal">
              {PROCEDURE_LABELS[procedure]}
            </span>
          </h2>
          <span className="text-meta text-ink-secondary">
            {stats.total} states + DC tracked
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(
            [
              "PROTECTED",
              "LEGAL",
              "RESTRICTED",
              "BANNED",
              "IN_LITIGATION",
            ] as CareStatus[]
          ).map((status) => {
            const count = stats.counts[status];
            const pct = Math.round((count / stats.total) * 100);
            return (
              <div
                key={status}
                className="rounded-card border border-divider bg-surface-inset/40 p-4"
              >
                <StatusPill status={status} />
                <div className="mt-3 text-section font-bold text-ink-primary leading-none">
                  {count}
                </div>
                <div className="mt-1 text-meta text-ink-secondary">
                  {pct}% of jurisdictions
                </div>
              </div>
            );
          })}
        </div>
        {showCenters && (
          <div className="mt-5 text-meta text-ink-secondary leading-relaxed">
            <span className="inline-flex items-center gap-1.5 text-ink-primary">
              <MapPin className="h-3.5 w-3.5 text-[#1D70B8]" />
              {CARE_CENTERS.length} sample care centers on the map
            </span>{" "}
            · <span className="text-ink-primary">{stats.centersInProtective}</span> sit
            in states currently <span className="lowercase">{statusLabel("PROTECTED")}</span>{" "}
            or <span className="lowercase">{statusLabel("LEGAL")}</span> for{" "}
            {PROCEDURE_LABELS[procedure]}.
          </div>
        )}
      </section>

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
            <span className="inline-flex items-center gap-2 rounded-chip bg-surface-inset px-3 py-1 text-meta text-ink-primary">
              <span className="h-2 w-2 rounded-full bg-[#1D70B8] ring-2 ring-white" />
              Care center
            </span>
            <span className="text-meta text-ink-secondary">
              Sample of gender-affirming care providers. Click a marker to open
              the state's full breakdown.
            </span>
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
              of state legislation. We re-run scrapers weekly and stamp each
              cell with its most recent update.
            </p>
            <p className="text-ink-secondary">
              The law in some states changes faster than we can re-scrape.{" "}
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
            <p>
              <a
                href="mailto:hello@seagull.app?subject=Care%20Map%20error"
                className="text-ink-primary underline-offset-4 hover:underline"
              >
                Report An Error
              </a>
            </p>
          </div>
        </div>
      </section>

      {activeState && (
        <StateDrawer
          state={CARE_STATUS_BY_CODE[activeState]}
          onClose={() => setActiveState(null)}
        />
      )}
      </Container>
    </div>
  );
}
