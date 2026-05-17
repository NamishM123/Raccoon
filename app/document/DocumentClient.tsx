"use client";

import { forwardRef, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Printer, AlertCircle, FileText, CreditCard } from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/cn";
import {
  ageFromDob,
  emptyProfile,
  inferHrtDirection,
  loadProfile,
  type AnatomyInventory,
  type Profile,
} from "@/lib/profile";
import { interpretLab, statusLabel } from "@/lib/lab_ranges";

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

type CardMode = "visit" | "wallet";

export function DocumentClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [reason, setReason] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [mode, setMode] = useState<CardMode>("visit");
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
        eyebrow="Cards for the clinic"
        title="A doctor-readable handoff in 30 seconds. Or a wallet card for when you can't speak."
        description="Pulls regimen, surgical history, anatomy inventory, recent labs against trans-specific targets, allergies, and what NOT to blame on HRT. Pick visit card or wallet card and print."
      />

      <Container className="pb-16">
        {!loaded ? null : !hasProfile ? (
          <div className="glass rounded-card p-7 flex items-start gap-4">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-status-restricted" />
            <div>
              <h2 className="text-subsection">Set up your profile first</h2>
              <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
                The card pulls from your meds, surgeries, anatomy, and labs.
                Add at least one medication or a regimen summary, then come back.
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
                <h2 className="text-subsection">Which card?</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <ModeToggle
                    active={mode === "visit"}
                    onClick={() => setMode("visit")}
                    icon={FileText}
                    label="Visit card"
                    hint="Full-page, for a clinic visit"
                  />
                  <ModeToggle
                    active={mode === "wallet"}
                    onClick={() => setMode("wallet")}
                    icon={CreditCard}
                    label="Wallet card"
                    hint="Credit-card size, for an emergency"
                  />
                </div>
              </div>

              {mode === "visit" && (
                <>
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
                      Recent injuries, things you want the doctor to
                      see at a glance. Optional.
                    </p>
                    <textarea
                      value={extraContext}
                      onChange={(e) => setExtraContext(e.target.value)}
                      rows={3}
                      placeholder="Currently 8 weeks post-op from top surgery."
                      className="mt-4 w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                    />
                  </div>
                </>
              )}

              {mode === "wallet" && (
                <div className="glass rounded-card p-7">
                  <h2 className="text-subsection">For when you can't speak for yourself</h2>
                  <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
                    Stops EMS, an ER, or a jail nurse from holding your hormones
                    by accident. Pulls regimen, allergies, anatomy, emergency
                    contact, and prescribing provider. Print, trim, and carry
                    it. If anything's missing, add it in your{" "}
                    <Link href="/places" className="underline">profile</Link>.
                  </p>
                </div>
              )}

              <div className="glass rounded-card p-7 flex items-center justify-between gap-4">
                <div className="text-meta text-ink-secondary">
                  {mode === "visit"
                    ? "The card updates as you type."
                    : "Prints at credit-card size (3.5\" × 2\")."}
                </div>
                <Button
                  onClick={print}
                  disabled={mode === "visit" ? !reason.trim() : false}
                >
                  <Printer className="h-4 w-4" /> Print {mode === "visit" ? "card" : "wallet card"}
                </Button>
              </div>
            </div>

            {/* Right: on-screen preview only */}
            <div className="lg:sticky lg:top-24 lg:self-start print:hidden">
              <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary mb-3">
                Preview
              </div>
              {mode === "visit" ? (
                <PrintableCard
                  profile={profile}
                  reason={reason}
                  extraContext={extraContext}
                />
              ) : (
                <WalletCard profile={profile} />
              )}
            </div>
          </div>
        )}
      </Container>

      {/* Print portal: a clean copy of the active card rendered straight under
          <body>, hidden on screen, so the print engine has nothing else to
          paginate. */}
      <PrintPortal>
        <div className="print-only-card">
          {mode === "visit" ? (
            <PrintableCard
              profile={profile}
              reason={reason}
              extraContext={extraContext}
            />
          ) : (
            <WalletCard profile={profile} />
          )}
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

const ANATOMY_LABELS: Record<keyof AnatomyInventory, string> = {
  cervix: "Cervix",
  uterus: "Uterus",
  ovaries: "Ovaries",
  breasts: "Breast tissue",
  prostate: "Prostate",
  testes: "Testes",
  penis: "Penis",
};

// Direction-specific "don't blame HRT" reminders. Things that get
// misattributed to hormones and shouldn't be.
function notHrtAttribution(direction: ReturnType<typeof inferHrtDirection>): string[] {
  const out = [
    "Acute chest pain or shortness of breath — always investigate.",
    "Sudden severe headache, vision change, or one-sided weakness.",
    "New unilateral leg swelling or calf pain.",
  ];
  if (direction === "feminizing" || direction === "nonbinary") {
    out.push(
      "Mood change is real but isn't a reason to stop HRT without a plan — withdrawal has its own risks."
    );
  }
  if (direction === "masculinizing" || direction === "nonbinary") {
    out.push(
      "Pelvic pain on testosterone is common (atrophic), but new severe pain or bleeding still deserves a workup."
    );
  }
  return out;
}

const PrintableCard = forwardRef<
  HTMLDivElement,
  { profile: Profile; reason: string; extraContext: string }
>(function PrintableCard({ profile, reason, extraContext }, ref) {
  const name = profile.display_name.trim() || "Patient";
  const pronouns = profile.pronouns.trim();
  const age = ageFromDob(profile.dob) ?? (profile.age ? Number(profile.age) : null);
  const dob = profile.dob;
  const direction = inferHrtDirection(profile);
  const meds = profile.medications.filter((m) => m.description.trim());
  const surgeries = profile.surgeries.filter((s) => s.description.trim());
  const labs = profile.recent_labs.filter((l) => l.name.trim() && l.value.trim());
  const allergies = profile.allergies.filter((a) => a.substance.trim());
  const anatomy = Object.entries(profile.anatomy).filter(([, v]) => v) as Array<
    [keyof AnatomyInventory, "present" | "absent"]
  >;
  const regimen = profile.hormone_regimen_summary.trim();
  const notHrtItems = notHrtAttribution(direction);

  return (
    <div
      ref={ref}
      className="printable-card rounded-card bg-white text-ink-primary"
      style={{ padding: "1.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-divider pb-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-ink-secondary font-bold">
            Pre-visit card — patient self-report
          </div>
          <div className="mt-1 text-card font-bold">
            {name}
            {pronouns && (
              <span className="ml-2 text-meta text-ink-secondary font-normal">
                ({pronouns})
              </span>
            )}
          </div>
          <div className="text-meta text-ink-secondary">
            {age !== null && <>Age {age}</>}
            {age !== null && dob && <> · </>}
            {dob && <>DOB {dob}</>}
          </div>
        </div>
        <div className="text-meta text-ink-secondary text-right">
          Visit date<br />
          <span className="text-ink-primary font-bold">
            {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Allergies banner — always visible, even when empty */}
      <div
        className={cnLite(
          "mt-3 rounded-btn border-2 px-4 py-2 text-meta",
          allergies.length > 0
            ? "border-status-banned bg-status-banned/10 text-status-banned"
            : "border-divider bg-surface-inset text-ink-primary"
        )}
      >
        <span className="font-bold uppercase tracking-[0.12em] text-[10px]">
          Allergies:
        </span>{" "}
        {allergies.length === 0 ? (
          <span>No known allergies (patient-reported).</span>
        ) : (
          <span>
            {allergies
              .map((a) => a.reaction ? `${a.substance} (${a.reaction})` : a.substance)
              .join(" · ")}
          </span>
        )}
      </div>

      {/* Chief complaint */}
      <Section title="Today I am here because" accent>
        <p className="text-body whitespace-pre-wrap leading-relaxed">
          {reason || "—"}
        </p>
      </Section>

      {/* HRT regimen */}
      {(direction || regimen || meds.length > 0) && (
        <Section
          title={
            direction
              ? `Gender-affirming hormone therapy (${direction})`
              : "Current medications"
          }
        >
          {regimen && (
            <p className="text-meta text-ink-primary leading-relaxed mb-2">{regimen}</p>
          )}
          {meds.length > 0 && (
            <ul className="text-meta text-ink-primary list-disc pl-5 space-y-0.5">
              {meds.map((m) => (
                <li key={m.id}>{m.description}</li>
              ))}
            </ul>
          )}
        </Section>
      )}

      {/* Surgical history */}
      {surgeries.length > 0 && (
        <Section title="Surgical history">
          <ul className="text-meta text-ink-primary list-disc pl-5 space-y-0.5">
            {surgeries.map((s) => (
              <li key={s.id}>
                {s.description}
                {s.date && <span className="text-ink-secondary"> · {s.date}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Anatomy inventory */}
      {anatomy.length > 0 && (
        <Section title="Anatomy inventory (relevant to screening & exams)">
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-meta">
            {anatomy.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-ink-primary">{ANATOMY_LABELS[k]}</span>
                <span
                  className={cnLite(
                    "font-bold text-[10px] uppercase tracking-[0.1em]",
                    v === "present" ? "text-status-protected" : "text-ink-secondary"
                  )}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Recent labs — with target band when matched */}
      {labs.length > 0 && (
        <Section title="Recent labs (patient-reported)">
          <table className="w-full text-meta">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-ink-secondary">
                <th className="pb-1 pr-3 font-normal">Test</th>
                <th className="pb-1 pr-3 font-normal">Value</th>
                <th className="pb-1 pr-3 font-normal">Target</th>
                <th className="pb-1 font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {labs.map((l) => {
                const r = interpretLab(
                  { name: l.name, value: l.value, unit: l.unit },
                  profile
                );
                const target =
                  r.matched && r.low !== null && r.high !== null
                    ? `${r.low}–${r.high} ${r.expectedUnit}`
                    : "—";
                return (
                  <tr key={l.id} className="border-t border-divider">
                    <td className="py-1 pr-3 text-ink-primary">{l.name}</td>
                    <td className="py-1 pr-3">
                      <span
                        className={cnLite(
                          "font-bold",
                          r.status === "high" || r.status === "low"
                            ? "text-status-banned"
                            : r.status === "monitor"
                              ? "text-status-restricted"
                              : "text-ink-primary"
                        )}
                      >
                        {l.value} {l.unit}
                      </span>
                      {r.matched && r.status !== "unknown" && (
                        <span className="ml-1 text-[10px] uppercase text-ink-secondary">
                          {statusLabel(r.status)}
                        </span>
                      )}
                    </td>
                    <td className="py-1 pr-3 text-ink-secondary">{target}</td>
                    <td className="py-1 text-ink-secondary">{l.date || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* Other context */}
      {extraContext.trim() && (
        <Section title="Other context">
          <p className="text-meta whitespace-pre-wrap leading-relaxed text-ink-primary">
            {extraContext}
          </p>
        </Section>
      )}

      {/* Don't attribute to HRT */}
      <Section title="Please do not attribute these to HRT without workup">
        <ul className="text-meta text-ink-primary list-disc pl-5 space-y-0.5">
          {notHrtItems.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </Section>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-divider text-[10px] text-ink-secondary leading-relaxed">
        Patient-reported only. Not a medical record. Generated by Seagull on{" "}
        {new Date().toLocaleString()}.
      </div>
    </div>
  );
});

// Local class-combine helper to avoid pulling cn() through the print portal —
// the portal's DOM doesn't get the page's tailwind purge context guarantees.
function cnLite(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cnLite("mt-3 rounded-btn border p-3", accent ? "border-accent/70 border-2" : "border-divider")}>
      <div
        className={cnLite(
          "text-[10px] uppercase tracking-[0.12em] font-bold",
          accent ? "text-accent" : "text-ink-secondary"
        )}
      >
        {title}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function ModeToggle({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof FileText;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-btn border-2 p-3 text-left transition-colors",
        active
          ? "border-accent bg-accent/10"
          : "border-divider bg-surface hover:bg-surface-inset"
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", active ? "text-accent" : "text-ink-secondary")} />
        <span className="text-meta font-bold text-ink-primary">{label}</span>
      </div>
      <div className="text-[11px] text-ink-secondary leading-snug">{hint}</div>
    </button>
  );
}

// Credit-card sized (3.5" x 2") emergency card. Printed in a portrait
// orientation, centered on the page. The patient trims it.
function WalletCard({ profile }: { profile: Profile }) {
  const name = profile.display_name.trim() || "Patient";
  const pronouns = profile.pronouns.trim();
  const direction = inferHrtDirection(profile);
  const allergies = profile.allergies.filter((a) => a.substance.trim());
  const meds = profile.medications.filter((m) => m.description.trim()).slice(0, 4);
  const surgeries = profile.surgeries.filter((s) => s.description.trim()).slice(0, 2);
  const anatomyAbsent = (Object.entries(profile.anatomy) as Array<
    [keyof AnatomyInventory, "" | "present" | "absent"]
  >)
    .filter(([, v]) => v === "absent")
    .map(([k]) => ANATOMY_LABELS[k as keyof typeof ANATOMY_LABELS])
    .join(", ");

  return (
    <div
      className="printable-card bg-white text-ink-primary border-2 border-ink-primary"
      style={{
        width: "3.5in",
        height: "2in",
        padding: "0.12in",
        fontSize: "7.5pt",
        lineHeight: 1.25,
        fontFamily: "system-ui, sans-serif",
        boxSizing: "border-box",
        display: "block",
      }}
    >
      <div className="flex items-baseline justify-between" style={{ borderBottom: "1px solid #333", paddingBottom: "2px" }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: "9pt" }}>{name}</span>
          {pronouns && <span style={{ marginLeft: "4px", color: "#555" }}>({pronouns})</span>}
        </div>
        <div style={{ fontSize: "6.5pt", fontWeight: 700, color: "#a00" }}>
          MEDICAL ID
        </div>
      </div>

      <div style={{ marginTop: "3px" }}>
        <span style={{ fontWeight: 700 }}>HRT:</span>{" "}
        {direction ? `${direction} — ` : ""}
        {meds.length > 0 ? meds.map((m) => m.description).join("; ") : "see provider"}
      </div>

      {surgeries.length > 0 && (
        <div style={{ marginTop: "2px" }}>
          <span style={{ fontWeight: 700 }}>Surg:</span>{" "}
          {surgeries.map((s) => s.description).join("; ")}
        </div>
      )}

      {anatomyAbsent && (
        <div style={{ marginTop: "2px" }}>
          <span style={{ fontWeight: 700 }}>Absent:</span> {anatomyAbsent}
        </div>
      )}

      <div style={{ marginTop: "2px", color: allergies.length ? "#a00" : "#000" }}>
        <span style={{ fontWeight: 700 }}>Allergies:</span>{" "}
        {allergies.length === 0
          ? "NKA"
          : allergies.map((a) => a.substance).join(", ")}
      </div>

      <div style={{ marginTop: "3px", borderTop: "1px solid #ccc", paddingTop: "2px", fontSize: "6.5pt", color: "#333" }}>
        <div>
          <span style={{ fontWeight: 700 }}>In emergency:</span> please continue
          HRT doses — interruption causes withdrawal.
        </div>
        {(profile.emergency_contact || profile.provider_contact) && (
          <div style={{ marginTop: "1px" }}>
            {profile.emergency_contact && (
              <>
                <span style={{ fontWeight: 700 }}>Contact:</span> {profile.emergency_contact}
              </>
            )}
            {profile.emergency_contact && profile.provider_contact && " · "}
            {profile.provider_contact && (
              <>
                <span style={{ fontWeight: 700 }}>Rx by:</span> {profile.provider_contact}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
