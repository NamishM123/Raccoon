"use client";

import { Fragment, useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Pill, StatusPill } from "@/components/Pill";
import { AuroraOverlay } from "@/components/ui/aurora-background";
import {
  CARE_STATUS_BY_CODE,
  PROCEDURE_KEYS,
  PROCEDURE_LABELS,
  getLastDataUpdate,
} from "@/data/care_status";
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
  const [insurance, setInsurance] = useState<string>("employer");
  const [activeState, setActiveState] = useState<string | null>(null);

  const lastUpdate = useMemo(() => getLastDataUpdate(), []);

  return (
    <div className="page-ocean">
      <AuroraOverlay variant="violet" />
      <PageHero
        title="Where Your State Stands On Gender Affirming Care"
        description="The legal landscape for HRT, surgery, ID changes, and shield laws across all 50 states."
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
        <div className="flex flex-col gap-3">
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
          <div className="mt-2 pt-3 border-t divider-soft text-meta text-ink-secondary">
            Last comprehensive update:{" "}
            <span className="text-ink-primary font-medium">{lastUpdate}</span>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="glass rounded-card p-4 md:p-8 mb-8">
        <USMap
          procedure={procedure}
          onSelect={(code) => setActiveState(code)}
        />
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
              of state legislation. Scrapers run weekly; each cell is stamped
              with its most recent update.
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
          onClose={() => setActiveState(null)}
        />
      )}
      </Container>
    </div>
  );
}
