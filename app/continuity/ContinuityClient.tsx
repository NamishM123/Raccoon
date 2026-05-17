"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Loader2,
  AlertTriangle,
  Users,
  Sparkles,
  Upload,
  FileText,
  Image as ImageIcon,
  X,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/cn";
import { emptyProfile, loadProfile, type Profile } from "@/lib/profile";

type Verdict =
  | "likely_normal_for_regimen"
  | "borderline_ask_doctor"
  | "outside_hrt_explanation"
  | "unflagged";

interface LabInterpretation {
  verdict: Verdict;
  headline: string;
  explanation: string;
  ask_doctor_about: string;
}

interface ParsedItem {
  name: string;
  value: string;
  unit: string;
  flag: string;
  verdict: string;
  note: string;
}

interface ParsedReport {
  report_date: string;
  summary: string;
  items: ParsedItem[];
}

const COMMON_LABS = [
  { name: "Hematocrit", unit: "%" },
  { name: "Hemoglobin", unit: "g/dL" },
  { name: "Estradiol", unit: "pg/mL" },
  { name: "Testosterone (total)", unit: "ng/dL" },
  { name: "Prolactin", unit: "ng/mL" },
  { name: "ALT", unit: "U/L" },
  { name: "Creatinine", unit: "mg/dL" },
  { name: "Potassium", unit: "mEq/L" },
  { name: "TSH", unit: "mIU/L" },
];

export function ContinuityClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);

  const hasProfile =
    profile.medications.length > 0 || profile.hormone_regimen_summary.length > 0;

  return (
    <div className="page-ocean">
      <PageHero
        eyebrow="Lab check"
        title="A weird number isn't always a problem."
        description="Upload your full blood report, or type a single value. Either way you get a plain-language read against your hormones. Not medical advice — just translation."
      />

      <Container className="pb-16">
        <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-6">
            {loaded && !hasProfile && (
              <div className="glass rounded-card p-6 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-status-restricted" />
                <div className="text-meta text-ink-secondary leading-relaxed">
                  <span className="text-ink-primary font-bold">
                    Heads up — we don't know your regimen yet.
                  </span>{" "}
                  We'll still answer, but it'll be generic. Add your hormones
                  on the <Link href="/places" className="underline">profile page</Link>{" "}
                  (smart-fill takes one sentence) for a tailored read.
                </div>
              </div>
            )}

            <UploadReport profile={profile} />

            <SingleValueCheck profile={profile} />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start flex flex-col gap-6">
            <MissingBookCard />

            <div className="glass rounded-card p-7">
              <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary mb-3">
                Data sources
              </div>
              <ul className="space-y-2 text-meta text-ink-primary">
                <li className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <a
                    href="https://eutils.ncbi.nlm.nih.gov/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline underline-offset-4"
                  >
                    PubMed E-utilities — research citations
                  </a>
                </li>
                <li className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <a
                    href="https://open.fda.gov/apis/drug/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline underline-offset-4"
                  >
                    openFDA — drug recalls & adverse events
                  </a>
                </li>
                <li className="inline-flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                  <a
                    href="https://rxnav.nlm.nih.gov/"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline underline-offset-4"
                  >
                    NLM RxNorm — medication normalization
                  </a>
                </li>
              </ul>
            </div>

            <div className="rounded-card bg-surface-inset p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-ink-primary" />
                <div className="text-meta text-ink-secondary leading-relaxed">
                  <div className="text-ink-primary text-meta font-bold mb-1">
                    This is not medical advice.
                  </div>
                  Seagull translates "is this number weird?" into context.
                  Diagnosis and treatment decisions belong with your
                  clinician. For an emergency, call 911 or{" "}
                  <span className="text-ink-primary font-bold">Trans Lifeline 877-565-8860</span>.
                </div>
              </div>
            </div>
          </aside>
        </div>
      </Container>
    </div>
  );
}

function UploadReport({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ParsedReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickFile(f: File | null) {
    setError(null);
    setReport(null);
    setFile(f);
  }

  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("profile", JSON.stringify(profile));
      const res = await fetch("/api/labs/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setError(data?.error || "Couldn't read that report.");
      } else {
        setReport(data as ParsedReport);
      }
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-card p-7">
      <div className="flex items-center gap-2">
        <Upload className="h-5 w-5 text-accent" />
        <h2 className="text-subsection">Upload your blood report</h2>
      </div>
      <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
        Drop a PDF or a phone photo. We'll read every value and tell you which
        ones look expected for your regimen — and which to bring up.
      </p>

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
          "mt-4 rounded-card border-2 border-dashed transition-colors cursor-pointer",
          "px-6 py-8 text-center",
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
              Drop a PDF or photo here
            </div>
            <div className="mt-1 text-meta text-ink-secondary">
              or click to choose · max 8 MB
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

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-meta text-ink-secondary">
          The file is sent once for parsing, then discarded.
        </span>
        <Button onClick={submit} disabled={!file || busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Reading…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Read & interpret
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-5 rounded-card bg-status-banned/10 px-4 py-3 text-meta text-status-banned">
          {error}
        </div>
      )}

      {report && (
        <ReportResults
          report={report}
          regimen={profile.hormone_regimen_summary || ""}
        />
      )}
    </div>
  );
}

function ReportResults({
  report,
  regimen,
}: {
  report: ParsedReport;
  regimen: string;
}) {
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-card border border-divider bg-surface-inset/30 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
            Overall
          </div>
          {report.report_date && (
            <div className="text-meta text-ink-secondary">
              {report.report_date}
            </div>
          )}
        </div>
        <p className="mt-2 text-body text-ink-primary leading-relaxed">
          {report.summary || "—"}
        </p>
      </div>

      {report.items.length === 0 ? (
        <div className="rounded-card bg-surface-inset px-5 py-4 text-meta text-ink-secondary">
          No lab values could be read from this file. Try a clearer photo or
          send the PDF directly.
        </div>
      ) : (
        <div className="space-y-2">
          {report.items.map((it, i) => (
            <ResultLine key={i} item={it} regimen={regimen} />
          ))}
        </div>
      )}
    </div>
  );
}

const VERDICT_META: Record<
  Verdict,
  { label: string; icon: typeof CheckCircle2; color: string; dot: string }
> = {
  likely_normal_for_regimen: {
    label: "Likely normal for your regimen",
    icon: CheckCircle2,
    color: "text-status-protected",
    dot: "bg-status-protected",
  },
  borderline_ask_doctor: {
    label: "Borderline — worth a quick ask",
    icon: HelpCircle,
    color: "text-status-restricted",
    dot: "bg-status-restricted",
  },
  outside_hrt_explanation: {
    label: "Hormones don't explain this — ask your doctor",
    icon: AlertTriangle,
    color: "text-status-banned",
    dot: "bg-status-banned",
  },
  unflagged: {
    label: "In range",
    icon: CheckCircle2,
    color: "text-ink-secondary",
    dot: "bg-ink-secondary",
  },
};

function ResultLine({ item, regimen }: { item: ParsedItem; regimen: string }) {
  const verdict = (item.verdict as Verdict) || "unflagged";
  const meta = VERDICT_META[verdict] || VERDICT_META.unflagged;
  const [open, setOpen] = useState(false);
  const flagged = verdict !== "unflagged" && verdict !== "likely_normal_for_regimen";
  return (
    <div className="rounded-card border border-divider bg-surface px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-body text-ink-primary font-bold">{item.name}</span>
            <span className="text-meta text-ink-secondary tabular-nums">
              {item.value}
              {item.unit ? " " + item.unit : ""}
            </span>
            {item.flag && item.flag !== "" && (
              <span
                className={cn(
                  "text-meta uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded-chip",
                  item.flag === "critical"
                    ? "bg-status-banned/15 text-status-banned"
                    : "bg-status-restricted/15 text-status-restricted"
                )}
              >
                {item.flag}
              </span>
            )}
          </div>
          {item.note && (
            <p className="mt-2 text-meta text-ink-primary leading-relaxed">
              {item.note}
            </p>
          )}
          <CohortBar
            labName={item.name}
            value={item.value}
            regimen={regimen}
          />
          {flagged && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="mt-2 inline-flex items-center gap-1.5 text-meta text-ink-primary hover:underline underline-offset-4"
            >
              <BookOpen className="h-3.5 w-3.5" />
              {open ? "Hide research" : "Find PubMed evidence"}
            </button>
          )}
          {open && <Citations labName={item.name} regimen={regimen} />}
        </div>
        <div className={cn("flex items-center gap-2 shrink-0", meta.color)}>
          <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
          <span className="text-meta font-bold uppercase tracking-[0.1em] hidden sm:inline">
            {shortVerdict(verdict)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface PercentilePayload {
  lab: string;
  regimen_label: string;
  unit: string;
  mean: number;
  sd: number;
  n: number;
  percentile: number;
  z: number;
  position_norm: number;
  user_value: number;
}

function CohortBar({
  labName,
  value,
  regimen,
}: {
  labName: string;
  value: string | number;
  regimen: string;
}) {
  const [data, setData] = useState<PercentilePayload | null>(null);
  const fetchedFor = useRef<string>("");

  useEffect(() => {
    const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.\-]/g, "")) : value;
    if (!labName || !Number.isFinite(num)) return;
    const key = `${labName}|${num}|${regimen}`;
    if (fetchedFor.current === key) return;
    fetchedFor.current = key;
    fetch("/api/cohort/percentile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lab_name: labName, value: num, regimen }),
    })
      .then((r) => r.json())
      .then((d) => setData(d?.result || null))
      .catch(() => setData(null));
  }, [labName, value, regimen]);

  if (!data) return null;
  return <PercentileVis data={data} />;
}

function MissingBookCard() {
  const [stats, setStats] = useState<{ total_observations: number; unique_regimens: number } | null>(null);
  useEffect(() => {
    fetch("/api/cohort/percentile")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => setStats(null));
  }, []);
  return (
    <div className="glass rounded-card p-7">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-ink-primary" />
        <h2 className="text-subsection">The missing book</h2>
      </div>
      {stats && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-btn border border-divider bg-surface px-3 py-2">
            <div className="text-card text-ink-primary tabular-nums">
              {stats.total_observations.toLocaleString()}
            </div>
            <div className="text-meta text-ink-secondary">observations seeded</div>
          </div>
          <div className="rounded-btn border border-divider bg-surface px-3 py-2">
            <div className="text-card text-ink-primary tabular-nums">
              {stats.unique_regimens}
            </div>
            <div className="text-meta text-ink-secondary">distinct regimens</div>
          </div>
        </div>
      )}
      <p className="mt-4 text-meta text-ink-secondary leading-relaxed">
        Medical textbooks have ranges for "men" and "women" — not "person on
        estradiol for 4 years." When you check a lab here, we look up where
        your value falls in the distribution of people on your regimen.
      </p>
      <p className="mt-3 text-meta text-ink-secondary leading-relaxed">
        The seed numbers are calibrated to published trans-HRT cohort studies
        (ENIGI, Defreyne, Velho). Real opt-in user data merges in over time —
        the book grows as the community fills it.
      </p>
      <div className="mt-5">
        <Link href="/places">
          <Button variant="secondary" size="sm">
            Open my profile
          </Button>
        </Link>
      </div>
    </div>
  );
}

function PercentileVis({ data }: { data: PercentilePayload }) {
  // Sample 60 points across mean ± 3σ to draw a smooth bell.
  const w = 320;
  const h = 56;
  const margin = 4;
  const points: Array<{ x: number; y: number }> = [];
  const N = 60;
  let maxPdf = 0;
  for (let i = 0; i <= N; i++) {
    const z = -3 + (i / N) * 6;
    const pdf = Math.exp(-0.5 * z * z);
    points.push({ x: i / N, y: pdf });
    if (pdf > maxPdf) maxPdf = pdf;
  }
  const path = points
    .map((p, i) => {
      const x = margin + p.x * (w - 2 * margin);
      const y = h - margin - (p.y / maxPdf) * (h - 2 * margin);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
  const baseline = `M ${margin} ${h - margin} L ${w - margin} ${h - margin}`;
  const userX = margin + data.position_norm * (w - 2 * margin);
  const tone =
    data.percentile <= 5 || data.percentile >= 95
      ? "#EF4444"
      : data.percentile <= 15 || data.percentile >= 85
      ? "#F59E0B"
      : "#16a34a";
  return (
    <div className="mt-3 rounded-btn border border-divider bg-surface-inset/40 px-3 py-2">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
          Cohort · {data.regimen_label} · n={data.n.toLocaleString()}
        </div>
        <div className="text-meta text-ink-primary">
          <span className="font-bold tabular-nums">{data.percentile}th</span>{" "}
          percentile
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 w-full h-auto" role="img">
        <defs>
          <linearGradient id="bell" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,130,246,0.25)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </linearGradient>
        </defs>
        <path d={`${path} L ${w - margin} ${h - margin} L ${margin} ${h - margin} Z`} fill="url(#bell)" />
        <path d={path} fill="none" stroke="#3B82F6" strokeWidth={1.5} />
        <path d={baseline} stroke="rgba(15,42,61,0.2)" strokeWidth={1} />
        {/* Mean tick */}
        <line
          x1={w / 2}
          x2={w / 2}
          y1={margin}
          y2={h - margin}
          stroke="rgba(15,42,61,0.25)"
          strokeWidth={1}
          strokeDasharray="2 3"
        />
        {/* User dot */}
        <line x1={userX} x2={userX} y1={margin} y2={h - margin} stroke={tone} strokeWidth={1.5} />
        <circle cx={userX} cy={h / 2} r={5} fill={tone} stroke="#fff" strokeWidth={1.5} />
      </svg>
      <div className="mt-1 flex items-center justify-between text-[10px] text-ink-secondary tabular-nums">
        <span>{(data.mean - 3 * data.sd).toFixed(1)}</span>
        <span>μ {data.mean}</span>
        <span>{(data.mean + 3 * data.sd).toFixed(1)} {data.unit}</span>
      </div>
    </div>
  );
}

function shortVerdict(v: Verdict): string {
  switch (v) {
    case "likely_normal_for_regimen":
      return "Expected";
    case "borderline_ask_doctor":
      return "Borderline";
    case "outside_hrt_explanation":
      return "Ask doctor";
    default:
      return "In range";
  }
}

interface Citation {
  pmid: string;
  title: string;
  authors: string[];
  source: string;
  year: string;
  url: string;
}

interface CuratedShift {
  name: string;
  regimen: string;
  direction: "up" | "down" | "shifts-to-natal-opposite";
  note: string;
}

function Citations({
  labName,
  regimen,
}: {
  labName: string;
  regimen: string;
}) {
  const [citations, setCitations] = useState<Citation[] | null>(null);
  const [shift, setShift] = useState<CuratedShift | null>(null);
  const [source, setSource] = useState<"live" | "curated" | "merged" | "none">("none");
  const [busy, setBusy] = useState(false);
  const fetchedFor = useRef<string>("");

  useEffect(() => {
    const key = `${labName}|${regimen}`;
    if (!labName || fetchedFor.current === key) return;
    fetchedFor.current = key;
    setBusy(true);
    fetch("/api/labs/evidence", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lab_name: labName, regimen }),
    })
      .then((r) => r.json())
      .then((d) => {
        setCitations(Array.isArray(d?.citations) ? d.citations : []);
        setShift(d?.curated_shift || null);
        setSource((d?.source as any) || "none");
      })
      .catch(() => {
        setCitations([]);
        setShift(null);
      })
      .finally(() => setBusy(false));
  }, [labName, regimen]);

  if (!labName) return null;

  return (
    <div className="mt-5 rounded-card border border-divider bg-surface px-5 py-4">
      <div className="flex items-center gap-2 flex-wrap">
        <BookOpen className="h-4 w-4 text-ink-primary" />
        <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
          Evidence on {labName}
        </div>
        <span
          className={cn(
            "text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded-chip",
            source === "live"
              ? "bg-status-protected/15 text-status-protected"
              : source === "merged"
              ? "bg-accent/15 text-accent"
              : source === "curated"
              ? "bg-surface text-ink-secondary border border-divider"
              : "hidden"
          )}
        >
          {source === "live"
            ? "Live PubMed"
            : source === "merged"
            ? "Live + curated"
            : source === "curated"
            ? "Curated reference"
            : ""}
        </span>
      </div>

      {shift && (
        <div className="mt-3 rounded-btn border border-divider bg-surface-inset/40 px-3 py-2">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
            Expected on {shift.regimen.replace("-", " ")}
          </div>
          <p className="mt-1 text-meta text-ink-primary leading-relaxed">{shift.note}</p>
        </div>
      )}

      {busy && !citations ? (
        <div className="mt-3 text-meta text-ink-secondary inline-flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Searching PubMed…
        </div>
      ) : citations && citations.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {citations.map((c) => (
            <li key={c.pmid}>
              <a
                href={c.url}
                target="_blank"
                rel="noreferrer"
                className="block group"
              >
                <div className="text-meta text-ink-primary leading-snug group-hover:underline underline-offset-4">
                  {c.title}
                </div>
                <div className="mt-0.5 text-meta text-ink-secondary">
                  {[
                    c.authors.slice(0, 2).join(", ") + (c.authors.length > 2 ? " et al." : ""),
                    c.source,
                    c.year,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  <span className="ml-1 text-ink-primary inline-flex items-center gap-1">
                    PubMed <ExternalLink className="h-3 w-3" />
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      ) : !shift ? (
        <div className="mt-3 text-meta text-ink-secondary">
          No matching studies on PubMed and no curated reference for this lab.
        </div>
      ) : (
        <div className="mt-3 text-meta text-ink-secondary">
          PubMed returned no recent studies — falling back to the curated guideline above.{" "}
          <a
            href={`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(labName + " transgender hormone")}`}
            target="_blank"
            rel="noreferrer"
            className="text-ink-primary hover:underline underline-offset-4 inline-flex items-center gap-1"
          >
            Search PubMed directly <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

function SingleValueCheck({ profile }: { profile: Profile }) {
  const [labName, setLabName] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LabInterpretation | null>(null);
  const [error, setError] = useState<string | null>(null);

  function pickLab(l: { name: string; unit: string }) {
    setLabName(l.name);
    setUnit(l.unit);
    setResult(null);
    setError(null);
  }

  async function check() {
    if (!labName.trim() || !value.trim() || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lab_name: labName.trim(),
          value: value.trim(),
          unit: unit.trim(),
          profile,
        }),
      });
      const data = await res.json();
      if (!res.ok) setError(data?.error || "Couldn't get an answer right now.");
      else setResult(data as LabInterpretation);
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass rounded-card p-7">
      <h2 className="text-subsection">Or check a single value</h2>
      <p className="mt-1 text-meta text-ink-secondary">
        Faster if you just want to look up one number.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {COMMON_LABS.map((l) => (
          <Pill key={l.name} selected={labName === l.name} onClick={() => pickLab(l)}>
            {l.name}
          </Pill>
        ))}
      </div>

      <div className="mt-5 grid sm:grid-cols-[2fr_1fr_1fr] gap-3">
        <input
          value={labName}
          onChange={(e) => setLabName(e.target.value)}
          placeholder="Test"
          className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Value"
          inputMode="decimal"
          className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
        <input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          placeholder="Unit"
          className="w-full rounded-btn border border-divider bg-surface px-3 py-2 text-body focus:outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="mt-4 flex items-center justify-end gap-3">
        <Button onClick={check} disabled={!labName.trim() || !value.trim() || busy}>
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Checking…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Check this value
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="mt-5 rounded-card bg-status-banned/10 px-4 py-3 text-meta text-status-banned">
          {error}
        </div>
      )}

      {result && (
        <SingleResult
          result={result}
          labName={labName}
          labValue={value}
          regimen={profile.hormone_regimen_summary || ""}
        />
      )}
    </div>
  );
}

function SingleResult({
  result,
  labName,
  labValue,
  regimen,
}: {
  result: LabInterpretation;
  labName: string;
  labValue: string;
  regimen: string;
}) {
  const meta =
    VERDICT_META[result.verdict as Verdict] || VERDICT_META.borderline_ask_doctor;
  const Icon = meta.icon;
  return (
    <div className="mt-6 rounded-card border border-divider bg-surface-inset/30 p-6">
      <div className="flex items-center gap-3">
        <span className={cn("h-2.5 w-2.5 rounded-full", meta.dot)} />
        <span className={cn("text-meta font-bold uppercase tracking-[0.12em]", meta.color)}>
          {meta.label}
        </span>
      </div>
      <div className="mt-3 flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", meta.color)} />
        <div className="text-body text-ink-primary font-bold leading-snug">
          {result.headline}
        </div>
      </div>
      <p className="mt-3 text-meta text-ink-primary leading-relaxed">
        {result.explanation}
      </p>
      {result.ask_doctor_about && (
        <div className="mt-4 rounded-btn border border-divider bg-surface px-4 py-3">
          <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
            Bring this up
          </div>
          <p className="mt-1 text-meta text-ink-primary">{result.ask_doctor_about}</p>
        </div>
      )}
      <CohortBar labName={labName} value={labValue} regimen={regimen} />
      <Citations labName={labName} regimen={regimen} />
    </div>
  );
}
