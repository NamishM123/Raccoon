"use client";

import { Fragment, forwardRef, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Printer, ClipboardList, Download, ChevronDown } from "lucide-react";
import { toPng } from "html-to-image";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { AuroraOverlay } from "@/components/ui/aurora-background";
import { WalletPass } from "@/components/WalletPass";
import {
  emptyProfile,
  loadProfile,
  type Profile,
} from "@/lib/profile";
import {
  annotateSurgeries,
  hormoneDuration,
  screeningReminders,
} from "@/lib/cardInsights";

const QUICK_REASONS = [
  "My arm hurts.",
  "I have a sore throat.",
  "I'm here for a yearly physical.",
  "I sprained my ankle.",
  "I have a rash.",
  "I'm having migraines.",
  "I have chest pain.",
  "Followup on a previous visit.",
];

type Mode = "full" | "wallet";

interface ComplaintHistory {
  onset: string;
  character: string;
  severity: string;
  better: string;
  worse: string;
  prior: string;
}

function emptyHistory(): ComplaintHistory {
  return { onset: "", character: "", severity: "", better: "", worse: "", prior: "" };
}

function hasAnyHistory(h: ComplaintHistory): boolean {
  return (
    !!h.onset.trim() ||
    !!h.character.trim() ||
    !!h.severity.trim() ||
    !!h.better.trim() ||
    !!h.worse.trim() ||
    !!h.prior.trim()
  );
}

export function DocumentClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const reason = [...selectedReasons, customReason.trim()]
    .filter(Boolean)
    .join(" ");
  const [extraContext, setExtraContext] = useState("");
  const [history, setHistory] = useState<ComplaintHistory>(emptyHistory());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [goals, setGoals] = useState<string[]>(["", "", ""]);
  const [mode, setMode] = useState<Mode>("full");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const walletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);

  const hasProfile =
    profile.medications.length > 0 ||
    profile.surgeries.length > 0 ||
    profile.hormone_regimen_summary.length > 0;

  function setGoal(i: number, v: string) {
    setGoals((g) => g.map((x, idx) => (idx === i ? v : x)));
  }

  function print() {
    window.print();
  }

  async function saveWalletPng() {
    if (!walletRef.current || busy) return;
    setBusy(true);
    try {
      const dataUrl = await toPng(walletRef.current, {
        pixelRatio: 3,
        cacheBust: true,
        backgroundColor: "transparent",
      });
      const a = document.createElement("a");
      a.download = `previsit-card-${new Date().toISOString().slice(0, 10)}.png`;
      a.href = dataUrl;
      a.click();
    } catch (err) {
      console.error(err);
      alert("Couldn't save the image. Try again, or use Print instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-ocean">
      <AuroraOverlay variant="amber" />
      <PageHero
        title={<>Hand It To The Front Desk<br />The Doctor Reads It In 30 Seconds</>}
        description="Counts your weeks postop. Flags screenings based on the anatomy you actually have. Looks like a Wallet pass on your phone."
      />

      <Container className="pb-16">
        {!loaded ? null : !hasProfile ? (
          <div className="glass rounded-card p-7 flex items-start gap-4">
            <ClipboardList className="h-7 w-7 shrink-0 text-status-restricted" />
            <div>
              <h2 className="text-subsection">Set Up Your Profile First</h2>
              <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
                Box 2 pulls from your medications and surgical history. Add at
                least one, or a regimen summary, then come back.
              </p>
              <div className="mt-4">
                <Link href="/places">
                  <Button size="sm">Go to your profile</Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            {/* Left: inputs */}
            <div className="flex flex-col gap-6 print:hidden">
              <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
                Your Visit
              </div>

              <div className="glass rounded-card p-7">
                <h2 className="text-subsection">Today's Reason</h2>
                <p className="mt-1 text-meta text-ink-secondary">
                  Tap any that apply, add your own words below, or both.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {QUICK_REASONS.map((r) => {
                    const isSelected = selectedReasons.includes(r);
                    return (
                      <Pill
                        key={r}
                        selected={isSelected}
                        onClick={() =>
                          setSelectedReasons((prev) =>
                            isSelected
                              ? prev.filter((x) => x !== r)
                              : [...prev, r]
                          )
                        }
                        className="w-full justify-center text-center"
                      >
                        {r}
                      </Pill>
                    );
                  })}
                </div>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={4}
                  placeholder="In your own words. e.g. My arm has been hurting for three days after I fell off my bike."
                  className="mt-4 w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                />

                <button
                  type="button"
                  onClick={() => setHistoryOpen((o) => !o)}
                  className="mt-4 flex items-center gap-2 text-meta text-ink-secondary hover:text-ink-primary"
                >
                  <ChevronDown
                    className={
                      "h-4 w-4 transition-transform " +
                      (historyOpen ? "rotate-180" : "")
                    }
                  />
                  Add details (saves the doctor 60 seconds of questions)
                </button>
                {historyOpen && (
                  <div className="mt-3 grid sm:grid-cols-2 gap-3">
                    <HistoryField
                      label="When did it start?"
                      placeholder="3 days ago, after lifting boxes"
                      value={history.onset}
                      onChange={(v) => setHistory((h) => ({ ...h, onset: v }))}
                    />
                    <HistoryField
                      label="What does it feel like?"
                      placeholder="Sharp, dull, throbbing, burning…"
                      value={history.character}
                      onChange={(v) => setHistory((h) => ({ ...h, character: v }))}
                    />
                    <div>
                      <div className="text-meta uppercase tracking-[0.1em] text-ink-secondary font-bold">
                        Severity at worst (0–10)
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <input
                          type="range"
                          min={0}
                          max={10}
                          step={1}
                          value={history.severity === "" ? 0 : Number(history.severity)}
                          onChange={(e) =>
                            setHistory((h) => ({ ...h, severity: e.target.value }))
                          }
                          className="flex-1 accent-accent"
                        />
                        <span className="text-body font-bold text-ink-primary w-8 text-right">
                          {history.severity === "" ? "—" : history.severity}
                        </span>
                      </div>
                    </div>
                    <HistoryField
                      label="Have you had this before?"
                      placeholder="Yes, similar episode in March. / No."
                      value={history.prior}
                      onChange={(v) => setHistory((h) => ({ ...h, prior: v }))}
                    />
                    <HistoryField
                      label="What makes it better?"
                      placeholder="Rest, ibuprofen, ice…"
                      value={history.better}
                      onChange={(v) => setHistory((h) => ({ ...h, better: v }))}
                    />
                    <HistoryField
                      label="What makes it worse?"
                      placeholder="Lifting overhead, lying flat, stress…"
                      value={history.worse}
                      onChange={(v) => setHistory((h) => ({ ...h, worse: v }))}
                    />
                  </div>
                )}
              </div>

              <div className="glass rounded-card p-7">
                <h2 className="text-subsection">Top 3 Goals For Today</h2>
                <p className="mt-1 text-meta text-ink-secondary">
                  Ranked. If the visit runs short, the doctor handles #1 first.
                </p>
                <div className="mt-4 space-y-2">
                  {goals.map((g, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-btn border border-divider bg-surface px-3 py-2"
                    >
                      <span className="text-meta font-bold text-accent w-5 shrink-0">
                        {i + 1}.
                      </span>
                      <input
                        value={g}
                        onChange={(e) => setGoal(i, e.target.value)}
                        placeholder={
                          i === 0
                            ? "e.g. Refill my estradiol"
                            : i === 1
                            ? "e.g. Look at my ankle"
                            : "e.g. Flu shot if there's time"
                        }
                        className="flex-1 bg-transparent text-body focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-card p-7">
                <h2 className="text-subsection">Anything Else? (optional)</h2>
                <p className="mt-1 text-meta text-ink-secondary">
                  Recent injuries, sensitivities, anything the doctor should see
                  at a glance.
                </p>
                <textarea
                  value={extraContext}
                  onChange={(e) => setExtraContext(e.target.value)}
                  rows={3}
                  placeholder="Currently 8 weeks postop from top surgery. Needles trigger panic; please warn before drawing."
                  className="mt-4 w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>
            </div>

            {/* Right: previews */}
            <div className="flex flex-col gap-6">
              {/* Preview toggle */}
              <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
                  Preview
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="inline-flex rounded-btn border border-divider bg-surface p-1 text-meta">
                    <button
                      onClick={() => setMode("full")}
                      className={
                        "px-3 py-1 rounded-btn transition-colors " +
                        (mode === "full"
                          ? "bg-accent/15 text-ink-primary font-bold"
                          : "text-ink-secondary")
                      }
                    >
                      Full Card
                    </button>
                    <button
                      onClick={() => setMode("wallet")}
                      className={
                        "px-3 py-1 rounded-btn transition-colors " +
                        (mode === "wallet"
                          ? "bg-accent/15 text-ink-primary font-bold"
                          : "text-ink-secondary")
                      }
                    >
                      Wallet Pass
                    </button>
                  </div>
                </div>
              </div>

              {mode === "full" ? (
                <>
                  <PrintableCard
                    profile={profile}
                    reason={reason}
                    history={history}
                    extraContext={extraContext}
                    goals={goals}
                  />
                  <div className="glass rounded-card p-5 flex items-center justify-between gap-4 print:hidden">
                    <div className="text-meta text-ink-secondary">
                      Card updates as you type.
                    </div>
                    <Button onClick={print} disabled={!reason.trim()}>
                      <Printer className="h-4 w-4" /> Print card
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center py-4">
                    <div ref={walletRef} className="w-full max-w-[440px]">
                      <WalletPass profile={profile} reason={reason} goals={goals} />
                    </div>
                  </div>
                  <div className="glass rounded-card p-5 flex items-center justify-between gap-4 print:hidden">
                    <div className="text-meta text-ink-secondary leading-snug">
                      Saves a high res PNG.
                      <br />
                      Add it to Photos, then Wallet, or AirDrop it.
                    </div>
                    <Button onClick={saveWalletPng} disabled={busy || !reason.trim()}>
                      {busy ? (
                        <>Saving…</>
                      ) : (
                        <>
                          <Download className="h-4 w-4" /> Save pass
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Container>

      <style jsx global>{`
        @media print {
          @page {
            size: letter;
            margin: 0.5in;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            color: #0a0a0a !important;
            position: static !important;
          }
          /* Kill ambient page backdrops. */
          .page-ocean::before,
          .page-ocean::after {
            display: none !important;
            content: none !important;
          }
          /* Hide everything via visibility so layout space is preserved but
             nothing paints. Strip positioning + transforms from every
             ancestor so .printable-card's position:absolute pins to <body>
             instead of inheriting an offset parent (.page-ocean was
             position:relative, which caused the card to print centered). */
          body * {
            visibility: hidden !important;
            position: static !important;
            transform: none !important;
            filter: none !important;
          }
          .printable-card,
          .printable-card * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .printable-card {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            right: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            -webkit-backdrop-filter: none !important;
            backdrop-filter: none !important;
            font-size: 10.5pt;
            line-height: 1.4;
            color: #0a0a0a;
          }
          /* Sections shouldn't split across pages. */
          .printable-card > * {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .printable-card h1,
          .printable-card h2,
          .printable-card h3 {
            break-after: avoid;
            page-break-after: avoid;
          }
          /* Pull margins/padding tight for compact one-page output. */
          .printable-card .mt-5 {
            margin-top: 0.55rem !important;
          }
          .printable-card .mt-4 {
            margin-top: 0.45rem !important;
          }
          .printable-card .mt-3 {
            margin-top: 0.35rem !important;
          }
          .printable-card .mt-2 {
            margin-top: 0.25rem !important;
          }
          .printable-card .pt-4 {
            padding-top: 0.4rem !important;
          }
          .printable-card .p-8 {
            padding: 0 !important;
          }
          .printable-card .p-5 {
            padding: 0.5rem 0.6rem !important;
          }
          .printable-card .p-4 {
            padding: 0.45rem 0.55rem !important;
          }
          .printable-card .p-3 {
            padding: 0.35rem 0.5rem !important;
          }
          .printable-card a {
            color: inherit !important;
            text-decoration: none !important;
          }
        }
      `}</style>
    </div>
  );
}

function HistoryField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-meta uppercase tracking-[0.1em] text-ink-secondary font-bold">
        {label}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
      />
    </div>
  );
}

const PrintableCard = forwardRef<
  HTMLDivElement,
  {
    profile: Profile;
    reason: string;
    history: ComplaintHistory;
    extraContext: string;
    goals: string[];
  }
>(function PrintableCard(
  { profile, reason, history, extraContext, goals },
  ref
) {
  const name = profile.display_name.trim();
  const legalName = profile.legal_name.trim();
  const pronouns = profile.pronouns.trim();
  const age = profile.age.trim();
  const sex = profile.sex_assigned_at_birth;
  const meds = profile.medications;
  const surgeries = annotateSurgeries(profile.surgeries);
  const regimen = profile.hormone_regimen_summary.trim();
  const allergies = profile.allergies.filter((a) => a.substance.trim());
  const inventory = profile.anatomical_inventory.trim();
  const preferences = profile.patient_preferences.trim();
  const labs = (profile.recent_labs || []).filter(
    (l) => l.name.trim() && l.value.trim()
  );
  const filledGoals = goals.map((g) => g.trim()).filter(Boolean);
  const historyRows: Array<[string, string]> = [
    ["Onset", history.onset.trim()],
    ["Character", history.character.trim()],
    [
      "Severity",
      history.severity.trim() ? `${history.severity.trim()}/10` : "",
    ],
    ["Better with", history.better.trim()],
    ["Worse with", history.worse.trim()],
    ["Prior episodes", history.prior.trim()],
  ].filter(([, v]) => !!v) as Array<[string, string]>;

  const regimenYears = hormoneDuration(regimen);
  const screenings = screeningReminders(profile);

  const demographicBits = [
    age && `Age ${age}`,
    sex && `${sex[0].toUpperCase()}${sex.slice(1)} at birth`,
  ].filter(Boolean);

  return (
    <div
      ref={ref}
      className="printable-card glass-strong rounded-card p-8 shadow-cardHover bg-white"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b divider-soft pb-4">
        <div className="min-w-0">
          <div className="text-meta uppercase tracking-[0.18em] text-ink-secondary">
            Previsit Card
          </div>
          <div className="mt-1 text-card">
            {name || legalName || "Patient"}
            {pronouns && (
              <span className="ml-2 text-meta text-ink-secondary font-normal">
                ({pronouns})
              </span>
            )}
          </div>
          {legalName && name && legalName.toLowerCase() !== name.toLowerCase() && (
            <div className="mt-0.5 text-meta text-ink-secondary">
              Legal: <span className="text-ink-primary">{legalName}</span>
            </div>
          )}
          {demographicBits.length > 0 && (
            <div className="mt-0.5 text-meta text-ink-secondary">
              {demographicBits.join(" · ")}
            </div>
          )}
        </div>
        <div className="text-meta text-ink-secondary text-right shrink-0">
          {new Date().toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Allergies — red strip, top of the card */}
      <div
        className={
          "mt-4 rounded-card border-2 p-4 " +
          (allergies.length > 0
            ? "border-status-banned/80 bg-status-banned/5"
            : "border-status-protected/50 bg-status-protected/5")
        }
      >
        <div
          className={
            "text-meta uppercase tracking-[0.12em] font-bold " +
            (allergies.length > 0 ? "text-status-banned" : "text-status-protected")
          }
        >
          Allergies
        </div>
        {allergies.length > 0 ? (
          <ul className="mt-2 space-y-0.5 text-meta text-ink-primary">
            {allergies.map((a) => (
              <li key={a.id}>
                <span className="font-bold">{a.substance}</span>
                {a.reaction && (
                  <span className="text-ink-secondary">, {a.reaction}</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-1 text-meta text-ink-secondary">No known allergies.</div>
        )}
      </div>

      {/* Anatomical inventory */}
      {inventory && (
        <div className="mt-3 rounded-card border border-divider bg-surface-inset/40 p-3">
          <span className="text-meta uppercase tracking-[0.12em] text-ink-secondary font-bold">
            Anatomy ·{" "}
          </span>
          <span className="text-meta text-ink-primary">{inventory}</span>
        </div>
      )}

      {/* Patient-set preferences / boundaries — short, prominent. */}
      {preferences && (
        <div className="mt-3 rounded-card border border-divider bg-surface-inset/40 p-3">
          <span className="text-meta uppercase tracking-[0.12em] text-ink-secondary font-bold">
            Preferences ·{" "}
          </span>
          <span className="text-meta text-ink-primary whitespace-pre-wrap">
            {preferences}
          </span>
        </div>
      )}

      <div className="mt-4 text-meta text-ink-secondary leading-relaxed">
        <span className="text-ink-primary font-bold">For the clinician:</span>{" "}
        Box 1 is today&apos;s chief complaint. Box 2 is hormone context —
        included so it isn&apos;t mistaken for the cause. Please assess them
        separately.
      </div>

      {/* Box 1 */}
      <div className="mt-4 rounded-card border-2 border-accent/70 p-5">
        <div className="text-meta uppercase tracking-[0.12em] text-accent font-bold">
          Box 1 · Today I Am Here Because
        </div>

        <p className="mt-2 text-body text-ink-primary whitespace-pre-wrap leading-relaxed">
          {reason || "…"}
        </p>

        {historyRows.length > 0 && (
          <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1 text-meta">
            {historyRows.map(([k, v]) => (
              <Fragment key={k}>
                <dt className="uppercase tracking-[0.1em] text-ink-secondary font-bold">
                  {k}
                </dt>
                <dd className="text-ink-primary">{v}</dd>
              </Fragment>
            ))}
          </dl>
        )}

        {filledGoals.length > 0 && (
          <div className="mt-4">
            <div className="text-meta uppercase tracking-[0.1em] text-ink-secondary font-bold">
              Goals for today (ranked)
            </div>
            <ol className="mt-2 space-y-0.5 text-meta text-ink-primary list-decimal pl-5">
              {filledGoals.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ol>
          </div>
        )}

      </div>

      {/* Box 2 */}
      <div className="mt-4 rounded-card border-2 border-ink-secondary/40 p-5 bg-surface-inset/40">
        <div className="flex items-center justify-between gap-3">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary font-bold">
            Box 2 · Hormone Context (Not Today&apos;s Reason)
          </div>
          {regimenYears && (
            <div className="text-meta text-ink-secondary">{regimenYears}</div>
          )}
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
                  <li key={m.id}>{m.description || "…"}</li>
                ))}
              </ul>
            </div>
          )}
          {surgeries.length > 0 && (
            <div>
              <div className="uppercase tracking-[0.1em] text-ink-secondary text-[11px]">
                Surgical History
              </div>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {surgeries.map((s) => (
                  <li key={s.id}>
                    {s.description || "…"}
                    {s.date && (
                      <span className="text-ink-secondary"> · {s.date}</span>
                    )}
                    {s.postop && (
                      <span className="ml-2 text-accent font-bold">
                        · {s.postop}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Recent labs — already collected, surfaced for reconciliation. */}
      {labs.length > 0 && (
        <div className="mt-4 rounded-card border border-divider p-5">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary font-bold">
            Recent Labs · Patient Reported
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-meta text-ink-primary">
            {labs.map((l) => (
              <li key={l.id}>
                <span className="font-bold">{l.name}</span>{" "}
                <span>{l.value}</span>
                {l.unit && <span> {l.unit}</span>}
                {l.date && (
                  <span className="text-ink-secondary"> · {l.date}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Screening reminders — derived, not echoed */}
      {screenings.length > 0 && (
        <div className="mt-4 rounded-card border border-divider p-5">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary font-bold">
            Screening windows · USPSTF general guidance
          </div>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-meta text-ink-primary">
            {screenings.map((s) => (
              <li key={s.label}>
                <span className="font-bold">{s.label}</span>{" "}
                <span className="text-ink-secondary">{s.detail}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 text-[11px] text-ink-secondary">
            Derived from anatomy + age. Reminders only, not a recommendation.
          </div>
        </div>
      )}

      {extraContext.trim() && (
        <div className="mt-4 rounded-card border border-divider p-5">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
            Other Context
          </div>
          <p className="mt-2 text-meta text-ink-primary whitespace-pre-wrap leading-relaxed">
            {extraContext}
          </p>
        </div>
      )}

      <div className="mt-5 pt-4 border-t divider-soft text-meta text-ink-secondary leading-relaxed">
        Made by the patient with Seagull. A self report, not a medical record.
      </div>
    </div>
  );
});
