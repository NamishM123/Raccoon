"use client";

import { forwardRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Printer, AlertCircle } from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import {
  emptyProfile,
  loadProfile,
  type Profile,
} from "@/lib/profile";

const QUICK_REASONS = [
  "My arm hurts.",
  "I have a sore throat.",
  "I'm here for a yearly physical.",
  "I sprained my ankle.",
  "I have a rash.",
  "I'm having migraines.",
  "I have chest pain.",
  "Follow-up on a previous visit.",
];

export function DocumentClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [reason, setReason] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);

  const hasProfile =
    profile.medications.length > 0 ||
    profile.surgeries.length > 0 ||
    profile.hormone_regimen_summary.length > 0;

  function print() {
    window.print();
  }

  return (
    <div className="page-ocean">
      <PageHero
        eyebrow="Pre-visit card"
        title="Hand it to the front desk. The doctor reads it in 30 seconds."
        description="Two boxes. Box 1: the thing that hurts. Box 2: I take hormones — and this is not why. Print it, screenshot it, or just show your phone."
      />

      <Container className="pb-16">
        {!loaded ? null : !hasProfile ? (
          <div className="glass rounded-card p-7 flex items-start gap-4">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-status-restricted" />
            <div>
              <h2 className="text-subsection">Set up your profile first</h2>
              <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
                The "this is not why I'm here" box pulls from your medications
                and surgical history. Add at least one medication or a regimen
                summary, then come back.
              </p>
              <div className="mt-4">
                <Link href="/places">
                  <Button size="sm">Go to your profile</Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
            {/* Left: inputs */}
            <div className="flex flex-col gap-6 print:hidden">
              <div className="glass rounded-card p-7">
                <h2 className="text-subsection">Today's reason</h2>
                <p className="mt-1 text-meta text-ink-secondary">
                  In your own words. Plain language is best.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  placeholder="My arm has been hurting for three days after I fell off my bike."
                  className="mt-4 w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
                <div className="mt-4 flex flex-wrap gap-2">
                  {QUICK_REASONS.map((r) => (
                    <Pill key={r} onClick={() => setReason(r)}>
                      {r}
                    </Pill>
                  ))}
                </div>
              </div>

              <div className="glass rounded-card p-7">
                <h2 className="text-subsection">Anything else?</h2>
                <p className="mt-1 text-meta text-ink-secondary">
                  Allergies, recent injuries, anything you want the doctor to
                  see at a glance. Optional.
                </p>
                <textarea
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  rows={3}
                  placeholder="Allergic to penicillin. Currently 8 weeks post-op from top surgery."
                  className="mt-4 w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <div className="glass rounded-card p-7 flex items-center justify-between gap-4">
                <div className="text-meta text-ink-secondary">
                  The card updates as you type.
                </div>
                <Button onClick={print} disabled={!reason.trim()}>
                  <Printer className="h-4 w-4" /> Print card
                </Button>
              </div>
            </div>

            {/* Right: on-screen preview only */}
            <div className="lg:sticky lg:top-24 lg:self-start print:hidden">
              <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary mb-3">
                Preview
              </div>
              <PrintableCard
                profile={profile}
                reason={reason}
                extraContext={extraContext}
              />
            </div>
          </div>
        )}
      </Container>

      {/* Print portal: a clean copy of the card rendered straight under <body>,
          hidden on screen, so the print engine has nothing else to paginate. */}
      <PrintPortal>
        <div className="print-only-card">
          <PrintableCard
            profile={profile}
            reason={reason}
            extraContext={extraContext}
          />
        </div>
      </PrintPortal>

      <style jsx global>{`
        .print-only-card {
          display: none;
        }
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          html,
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Hide every direct child of body except the print portal. */
          body > *:not(.print-portal) {
            display: none !important;
          }
          .print-portal {
            display: block !important;
            position: static !important;
          }
          .print-only-card {
            display: block !important;
          }
          .print-only-card .printable-card {
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            background: white !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

function PrintPortal({ children }: { children: React.ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.className = "print-portal";
    document.body.appendChild(el);
    setHost(el);
    return () => {
      document.body.removeChild(el);
    };
  }, []);
  if (!host) return null;
  return createPortal(children, host);
}

const PrintableCard = forwardRef<
  HTMLDivElement,
  { profile: Profile; reason: string; extraContext: string }
>(function PrintableCard({ profile, reason, extraContext }, ref) {
  const name = profile.display_name.trim();
  const pronouns = profile.pronouns.trim();
  const meds = profile.medications;
  const surgeries = profile.surgeries;
  const regimen = profile.hormone_regimen_summary.trim();

  return (
    <div
      ref={ref}
      className="printable-card glass-strong rounded-card p-8 shadow-cardHover bg-white"
    >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b divider-soft pb-4">
          <div>
            <div className="text-meta uppercase tracking-[0.18em] text-ink-secondary">
              Pre-visit card
            </div>
            <div className="mt-1 text-card">
              {name || "Patient"}
              {pronouns && (
                <span className="ml-2 text-meta text-ink-secondary font-normal">
                  ({pronouns})
                </span>
              )}
            </div>
          </div>
          <div className="text-meta text-ink-secondary text-right">
            {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>

        {/* Box 1 */}
        <div className="mt-5 rounded-card border-2 border-accent/70 p-5">
          <div className="text-meta uppercase tracking-[0.12em] text-accent font-bold">
            Box 1 — Today I am here because
          </div>
          <p className="mt-2 text-body text-ink-primary whitespace-pre-wrap leading-relaxed">
            {reason || "—"}
          </p>
        </div>

        {/* Box 2 */}
        <div className="mt-4 rounded-card border-2 border-ink-secondary/40 p-5 bg-surface-inset/40">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-primary font-bold">
            Box 2 — I am on hormones. This is NOT why I am here today.
          </div>
          <div className="mt-3 space-y-2 text-meta text-ink-primary leading-relaxed">
            {regimen && <p>{regimen}</p>}
            {meds.length > 0 && (
              <div>
                <div className="uppercase tracking-[0.1em] text-ink-secondary text-[11px]">
                  Medications
                </div>
                <ul className="mt-1 list-disc pl-5 space-y-0.5">
                  {meds.map((m) => (
                    <li key={m.id}>{m.description || "—"}</li>
                  ))}
                </ul>
              </div>
            )}
            {surgeries.length > 0 && (
              <div>
                <div className="uppercase tracking-[0.1em] text-ink-secondary text-[11px]">
                  Surgical history
                </div>
                <ul className="mt-1 list-disc pl-5 space-y-0.5">
                  {surgeries.map((s) => (
                    <li key={s.id}>
                      {s.description || "—"}
                      {s.date && (
                        <span className="text-ink-secondary"> · {s.date}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {extraContext.trim() && (
          <div className="mt-4 rounded-card border border-divider p-5">
            <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
              Other context
            </div>
            <p className="mt-2 text-meta text-ink-primary whitespace-pre-wrap leading-relaxed">
              {extraContext}
            </p>
          </div>
        )}

      <div className="mt-5 pt-4 border-t divider-soft text-meta text-ink-secondary leading-relaxed">
        This card was made by the patient using Seagull. It is a
        self-report, not a medical record.
      </div>
    </div>
  );
});
