"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  X,
  AlertTriangle,
  AlertCircle,
  Info,
  HelpCircle,
  CheckCircle2,
  Stethoscope,
  Type,
} from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/cn";
import { emptyProfile, loadProfile, type Profile } from "@/lib/profile";

interface Flag {
  severity: "high" | "medium" | "low" | string;
  title: string;
  finding: string;
  why: string;
  what_to_ask: string;
}

interface ReadResult {
  document_type: string;
  summary: string;
  flags: Flag[];
  questions: string[];
}

type Mode = "file" | "text";

export function NotesClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [loaded, setLoaded] = useState(false);
  const [mode, setMode] = useState<Mode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ReadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);

  const hasProfile =
    profile.medications.length > 0 || profile.hormone_regimen_summary.length > 0;

  function pickFile(f: File | null) {
    setError(null);
    setResult(null);
    setFile(f);
  }

  async function submit() {
    if ((mode === "file" && !file) || (mode === "text" && !text.trim()) || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      if (mode === "file" && file) form.append("file", file);
      if (mode === "text") form.append("text", text);
      form.append("profile", JSON.stringify(profile));
      const res = await fetch("/api/visits/read", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setError(data?.error || "Couldn't read that document.");
      } else {
        setResult(data as ReadResult);
      }
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setBusy(false);
    }
  }

  function loadDemo() {
    setMode("text");
    setText(
      `After-visit summary — Endocrinology follow-up
Patient: Alex Chen | DOB: 1995-03-14 | MRN: 0034521
Date of visit: ${new Date().toLocaleDateString()}

ASSESSMENT:
Patient on testosterone cypionate 100 mg IM weekly for ~4 years. Recent labs:
  - Hematocrit 50.8% (high normal)
  - Hemoglobin 16.4 g/dL
  - Testosterone 240 ng/dL (low — below reference for adult male)

PLAN:
1. Increase testosterone cypionate to 200 mg IM weekly given low T level.
2. Recheck labs in 12 weeks.
3. Discussed patient concerns about fatigue — reassured this is likely anxiety; recommend mindfulness.

No follow-up CBC ordered at this time.`
    );
    setFile(null);
    setResult(null);
    setError(null);
  }

  return (
    <div className="page-ocean">
      <PageHero
        eyebrow="Doctor's Read"
        title="Snap your after-visit summary. Catch what the doctor missed."
        description="Upload a photo, PDF, or paste the text. We translate the jargon and check every conclusion against trans-HRT clinical guidelines using your stored regimen as context. Not medical advice — a second pair of eyes."
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-meta text-sea-ink/75">
          <span className="inline-flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            <span className="text-ink-primary font-bold">WPATH SOC v8</span> + Endocrine Society 2017
          </span>
          <span className="inline-flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            Cross-referenced with your profile
          </span>
        </div>
      </PageHero>

      <Container className="pb-16">
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-6">
            {loaded && !hasProfile && (
              <div className="glass rounded-card p-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-status-restricted" />
                <div className="text-meta text-ink-secondary leading-relaxed">
                  <span className="text-ink-primary font-bold">
                    Add your regimen first.
                  </span>{" "}
                  Doctor's Read is dramatically more useful when it knows what
                  hormones you're on. Set up your{" "}
                  <Link href="/places" className="underline">profile</Link>{" "}
                  — smart-fill takes one sentence.
                </div>
              </div>
            )}

            <div className="glass rounded-card p-7">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-accent" />
                  <h2 className="text-subsection">Your document</h2>
                </div>
                <div className="inline-flex rounded-btn border border-divider bg-surface p-0.5">
                  <ModeButton active={mode === "file"} onClick={() => setMode("file")}>
                    <Upload className="h-3.5 w-3.5" /> File
                  </ModeButton>
                  <ModeButton active={mode === "text"} onClick={() => setMode("text")}>
                    <Type className="h-3.5 w-3.5" /> Paste
                  </ModeButton>
                </div>
              </div>

              {mode === "file" ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) pickFile(f);
                  }}
                  onClick={() => inputRef.current?.click()}
                  className={cn(
                    "mt-4 rounded-card border-2 border-dashed transition-colors cursor-pointer px-6 py-8 text-center",
                    dragging
                      ? "border-accent bg-accent/5"
                      : "border-divider hover:border-accent/60 bg-surface-inset/30"
                  )}
                >
                  <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => pickFile(e.target.files?.[0] || null)}
                  />
                  {!file ? (
                    <>
                      <div className="flex items-center justify-center gap-3 text-ink-secondary">
                        <FileText className="h-5 w-5" />
                        <ImageIcon className="h-5 w-5" />
                      </div>
                      <div className="mt-3 text-body text-ink-primary font-medium">
                        Drop your after-visit summary
                      </div>
                      <div className="mt-1 text-meta text-ink-secondary">
                        PDF or photo · max 8 MB
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="h-5 w-5 text-ink-primary" />
                      <div className="text-body text-ink-primary font-medium truncate max-w-[280px]">
                        {file.name}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          pickFile(null);
                        }}
                        className="text-ink-secondary hover:text-status-banned p-1"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  placeholder="Paste the after-visit summary, portal message, or doctor's note here…"
                  className="mt-4 w-full rounded-btn border border-divider bg-surface px-3 py-3 text-body focus:outline-none focus:ring-2 focus:ring-accent/30 font-mono"
                />
              )}

              <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                <button
                  onClick={loadDemo}
                  className="text-meta text-ink-secondary hover:text-ink-primary underline-offset-4 hover:underline"
                >
                  Try a demo note →
                </button>
                <Button
                  onClick={submit}
                  disabled={busy || (mode === "file" ? !file : !text.trim())}
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Reading…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Read & flag
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <div className="mt-5 rounded-card bg-status-banned/10 px-4 py-3 text-meta text-status-banned">
                  {error}
                </div>
              )}
            </div>

            {result && <ResultPanel result={result} />}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start flex flex-col gap-6">
            <div className="glass rounded-card p-7">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-ink-primary" />
                <h2 className="text-subsection">How this works</h2>
              </div>
              <p className="mt-3 text-meta text-ink-secondary leading-relaxed">
                Most after-visit summaries are written by clinicians who don't
                routinely treat trans patients. The same number reads
                differently depending on your regimen, the timing of the draw,
                and the goal of treatment.
              </p>
              <p className="mt-3 text-meta text-ink-secondary leading-relaxed">
                We check every conclusion in the document against established
                guidelines (WPATH SOC v8, Endocrine Society 2017) using your
                stored regimen as context — then surface the questions you
                should bring back.
              </p>
            </div>

            <div className="glass rounded-card p-7">
              <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary mb-3">
                Patterns we catch
              </div>
              <ul className="space-y-2 text-meta text-ink-primary">
                <PatternItem>
                  Trough-vs-peak timing missed when reading hormone levels
                </PatternItem>
                <PatternItem>
                  "Low T" on feminizing HRT misread as deficiency
                </PatternItem>
                <PatternItem>
                  Hematocrit on T flagged as pathology when expected
                </PatternItem>
                <PatternItem>
                  HRT-cessation recommendations for non-HRT issues
                </PatternItem>
                <PatternItem>
                  Big dose changes from a single data point
                </PatternItem>
                <PatternItem>
                  Missing follow-up labs after a change
                </PatternItem>
                <PatternItem>
                  Deadnaming / misgendering in the chart itself
                </PatternItem>
              </ul>
            </div>

            <div className="rounded-card bg-surface-inset p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-ink-primary" />
                <div className="text-meta text-ink-secondary leading-relaxed">
                  <div className="text-ink-primary text-meta font-bold mb-1">
                    Not medical advice.
                  </div>
                  Doctor's Read is a structured second opinion against
                  guidelines. Final decisions belong with your clinician. Bring
                  the flagged questions to your next visit.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 text-meta rounded-[6px] transition-colors",
        active
          ? "bg-surface-inset text-ink-primary font-bold"
          : "text-ink-secondary hover:text-ink-primary"
      )}
    >
      {children}
    </button>
  );
}

function PatternItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
      <span>{children}</span>
    </li>
  );
}

function ResultPanel({ result }: { result: ReadResult }) {
  const highCount = result.flags.filter((f) => f.severity === "high").length;
  const flagsByDocType: Record<string, string> = {
    after_visit_summary: "After-visit summary",
    portal_message: "Portal message",
    lab_report: "Lab report",
    discharge_instructions: "Discharge instructions",
    referral: "Referral",
    other: "Document",
  };
  return (
    <div className="space-y-6">
      <div className="glass rounded-card p-7">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
            {flagsByDocType[result.document_type] || "Document"} · plain English
          </div>
          {result.flags.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-meta text-status-protected font-bold">
              <CheckCircle2 className="h-4 w-4" /> No flags
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-meta text-status-restricted font-bold">
              <AlertTriangle className="h-4 w-4" />
              {result.flags.length} flag{result.flags.length === 1 ? "" : "s"}
              {highCount > 0 && (
                <span className="text-status-banned ml-1">· {highCount} high-severity</span>
              )}
            </span>
          )}
        </div>
        <p className="mt-3 text-body text-ink-primary leading-relaxed">
          {result.summary}
        </p>
      </div>

      {result.flags.length > 0 && (
        <div className="space-y-3">
          {result.flags.map((f, i) => (
            <FlagCard key={i} flag={f} />
          ))}
        </div>
      )}

      {result.questions.length > 0 && (
        <div className="glass rounded-card p-7">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-accent" />
            <h2 className="text-subsection">Bring these to your next visit</h2>
          </div>
          <ol className="mt-4 space-y-3">
            {result.questions.map((q, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent text-meta font-bold tabular-nums">
                  {i + 1}
                </span>
                <span className="text-body text-ink-primary leading-relaxed">{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const SEVERITY_META: Record<
  string,
  { label: string; bar: string; chip: string; icon: typeof AlertTriangle }
> = {
  high: {
    label: "High",
    bar: "before:bg-status-banned",
    chip: "bg-status-banned/15 text-status-banned",
    icon: AlertTriangle,
  },
  medium: {
    label: "Medium",
    bar: "before:bg-status-restricted",
    chip: "bg-status-restricted/15 text-status-restricted",
    icon: AlertCircle,
  },
  low: {
    label: "Low",
    bar: "before:bg-ink-secondary",
    chip: "bg-surface text-ink-secondary border border-divider",
    icon: Info,
  },
};

function FlagCard({ flag }: { flag: Flag }) {
  const meta = SEVERITY_META[flag.severity] || SEVERITY_META.medium;
  const Icon = meta.icon;
  return (
    <div
      className={cn(
        "glass rounded-card p-6 relative overflow-hidden",
        "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1",
        meta.bar
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <Icon className="h-5 w-5 text-ink-primary" />
        <h3 className="text-card text-ink-primary">{flag.title}</h3>
        <span
          className={cn(
            "text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded-chip",
            meta.chip
          )}
        >
          {meta.label}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <div>
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
            From the document
          </div>
          <p className="mt-1 text-meta text-ink-primary leading-relaxed italic">
            "{flag.finding}"
          </p>
        </div>
        <div>
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
            Why this matters
          </div>
          <p className="mt-1 text-meta text-ink-primary leading-relaxed">
            {flag.why}
          </p>
        </div>
        <div className="rounded-btn border border-accent/30 bg-accent/5 px-4 py-3">
          <div className="text-meta uppercase tracking-[0.12em] text-accent font-bold">
            Ask the doctor
          </div>
          <p className="mt-1 text-meta text-ink-primary leading-relaxed">
            {flag.what_to_ask}
          </p>
        </div>
      </div>
    </div>
  );
}
