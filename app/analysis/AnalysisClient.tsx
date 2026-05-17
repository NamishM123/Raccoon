"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Download,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import {
  deleteAnalysis,
  downloadBlob,
  getAnalysis,
  listAnalyses,
  newId,
  saveAnalysis,
  type AnalysisMeta,
} from "@/lib/analysisStore";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { cn } from "@/lib/cn";
import { emptyProfile, loadProfile, type Profile } from "@/lib/profile";

// ── Types ─────────────────────────────────────────────────────────────────────

interface TermDef {
  word: string;
  explanation: string;
}

interface TimelineItem {
  heading: string;
  plain: string;
  terms: TermDef[];
}

interface Comparison {
  recommendation: string;
  alignment: "aligned" | "concern" | "neutral";
  headline: string;
  detail: string;
  terms: TermDef[];
}

interface AnalysisResult {
  visit_date: string;
  provider: string;
  timeline: TimelineItem[];
  comparisons: Comparison[];
}

// ── Main component ────────────────────────────────────────────────────────────

export function AnalysisClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);

  const hasProfile =
    profile.medications.length > 0 ||
    profile.surgeries.length > 0 ||
    profile.recent_labs.length > 0 ||
    profile.hormone_regimen_summary.length > 0;

  return (
    <div className="page-ocean">
      <PageHero
        title={<>What Your Doctor Said,<br />In Plain English</>}
        description="Upload your after visit notes or summary. We'll break down the key points in simple language and compare the doctor's recommendations against your own health data."
      />

      <Container className="pb-16">
        {loaded && !hasProfile && (
          <div className="mb-6 glass rounded-card p-7 flex items-start gap-4">
            <AlertCircle className="h-7 w-7 shrink-0 text-status-restricted" />
            <div>
              <h2 className="text-subsection">No Profile Data Yet</h2>
              <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
                The summary section will still work. For the comparison section to reference your
                specific labs and medications, add them on the{" "}
                <a href="/places" className="underline underline-offset-4">Profile page</a> first.
              </p>
            </div>
          </div>
        )}

        <UploadAndAnalyze profile={profile} />
      </Container>
    </div>
  );
}

// ── Upload + analysis orchestrator ────────────────────────────────────────────

const SESSION_ACTIVE_KEY = "seagull_analysis_active_id";

function UploadAndAnalyze({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisMeta[]>([]);

  // On mount: load history, then restore the last-viewed analysis from sessionStorage
  useEffect(() => {
    listAnalyses().then(async (list) => {
      setHistory(list);
      const storedId = sessionStorage.getItem(SESSION_ACTIVE_KEY);
      if (storedId && list.some(h => h.id === storedId)) {
        const record = await getAnalysis(storedId);
        if (record) {
          setResult(record.result as AnalysisResult);
          setActiveId(storedId);
        }
      }
    }).catch(() => {});
  }, []);

  // Keep sessionStorage in sync so navigation away and back restores the view
  useEffect(() => {
    if (activeId) sessionStorage.setItem(SESSION_ACTIVE_KEY, activeId);
    else sessionStorage.removeItem(SESSION_ACTIVE_KEY);
  }, [activeId]);

  function pickFile(f: File | null) {
    setError(null);
    setFile(f);
  }

  async function loadRecord(id: string) {
    const record = await getAnalysis(id);
    if (!record) return;
    setResult(record.result as AnalysisResult);
    setActiveId(id);
    setFile(null);
    // Scroll down so the results are visible after clicking a history row
    setTimeout(() => window.scrollBy({ top: 300, behavior: "smooth" }), 50);
  }

  async function handleDelete(id: string) {
    await deleteAnalysis(id);
    const updated = await listAnalyses();
    setHistory(updated);
    if (activeId === id) { setResult(null); setActiveId(null); }
  }

  async function handleDownload(id: string) {
    const record = await getAnalysis(id);
    if (record) downloadBlob(record.fileBlob, record.filename);
  }

  async function analyze() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setActiveId(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("profile", JSON.stringify(profile));
      const res = await fetch("/api/analysis/parse", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setError(data?.error || "Couldn't analyze that document.");
      } else {
        const id = newId();
        const record = {
          id,
          filename: file.name,
          fileType: file.type,
          fileBlob: new Blob([await file.arrayBuffer()], { type: file.type }),
          analyzedAt: new Date().toISOString(),
          visitDate: (data as AnalysisResult).visit_date ?? "",
          provider: (data as AnalysisResult).provider ?? "",
          result: data,
        };
        await saveAnalysis(record);
        const updated = await listAnalyses();
        setHistory(updated);
        setResult(data as AnalysisResult);
        setActiveId(id);
      }
    } catch (e: any) {
      setError(e?.message || "Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── History panel ─────────────────────────────────────────── */}
      {history.length > 0 && (
        <HistoryPanel
          history={history}
          activeId={activeId}
          onLoad={loadRecord}
          onDownload={handleDownload}
          onDelete={handleDelete}
        />
      )}

      {/* ── Upload card ───────────────────────────────────────────── */}
      <div className="glass rounded-card p-7">
        <h2 className="text-subsection">Upload Your Visit Notes</h2>
        <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
          Drop the after visit summary your doctor gave you (PDF, photo, or screenshot).
          We'll read the whole thing so you don't have to decode it.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) pickFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mt-5 rounded-card border-2 border-dashed transition-colors cursor-pointer px-6 py-10 text-center",
            dragging
              ? "border-brand bg-brand/5"
              : "border-divider hover:border-brand/50 bg-surface-inset/30"
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
                <FileText className="h-6 w-6" />
                <ImageIcon className="h-6 w-6" />
              </div>
              <div className="mt-3 text-body text-ink-primary font-medium">
                Drop your after visit summary here
              </div>
              <div className="mt-1 text-meta text-ink-secondary">
                or click to choose · PDF or photo · max 8 MB
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-5 w-5 text-ink-primary" />
              <span className="text-body text-ink-primary font-medium truncate max-w-[280px]">
                {file.name}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); pickFile(null); }}
                className="text-ink-secondary hover:text-status-banned p-1"
                aria-label="Remove file"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-meta text-ink-secondary">
            Stored privately in your browser. Never sent to a server.
          </span>
          <Button onClick={analyze} disabled={!file || busy}>
            {busy ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Analyze visit</>
            )}
          </Button>
        </div>

        {error && (
          <div className="mt-5 rounded-card bg-status-banned/10 px-4 py-3 text-meta text-status-banned">
            {error}
          </div>
        )}
      </div>

      {result && <AnalysisResults result={result} />}
    </div>
  );
}

// ── History panel ────────────────────────────────────────────────────────────

function HistoryPanel({
  history,
  activeId,
  onLoad,
  onDownload,
  onDelete,
}: {
  history: AnalysisMeta[];
  activeId: string | null;
  onLoad: (id: string) => void;
  onDownload: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  function fmtDate(iso: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="glass rounded-card overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <FileText className="h-4 w-4 text-brand" />
          <span className="text-body font-bold text-ink-primary">
            Saved Analyses
          </span>
          <span className="text-[12px] font-semibold text-ink-secondary bg-surface-inset px-2 py-0.5 rounded-full">
            {history.length}
          </span>
        </div>
        <ChevronDown className={cn("h-4 w-4 text-ink-secondary transition-transform duration-200", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-black/[0.05] divide-y divide-black/[0.04]">
          {history.map((h) => (
            <div
              key={h.id}
              className={cn(
                "flex items-center gap-3 px-6 py-3.5 transition-colors",
                h.id === activeId ? "bg-brand/8" : "hover:bg-white/40"
              )}
            >
              {/* File icon */}
              <div className={cn(
                "h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase",
                h.fileType === "application/pdf"
                  ? "bg-red-100 text-red-600"
                  : "bg-sky-100 text-sky-600"
              )}>
                {h.fileType === "application/pdf" ? "PDF" : "IMG"}
              </div>

              {/* Meta */}
              <button
                onClick={() => onLoad(h.id)}
                className="flex-1 min-w-0 text-left"
              >
                <p className={cn(
                  "text-meta font-semibold truncate",
                  h.id === activeId ? "text-brand" : "text-ink-primary"
                )}>
                  {h.filename}
                </p>
                <p className="text-[12px] text-ink-secondary mt-0.5">
                  {h.provider
                    ? <>{h.provider}{h.visitDate ? ` · ${h.visitDate}` : ""}</>
                    : h.visitDate || fmtDate(h.analyzedAt)
                  }
                  <span className="ml-2 opacity-60">· Analyzed {fmtDate(h.analyzedAt)}</span>
                </p>
              </button>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onDownload(h.id)}
                  className="p-1.5 rounded-lg text-ink-secondary hover:text-brand hover:bg-brand/10 transition-colors"
                  title="Download original file"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => onDelete(h.id)}
                  className="p-1.5 rounded-lg text-ink-secondary hover:text-status-banned hover:bg-status-banned/10 transition-colors"
                  title="Delete this analysis"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Results layout ─────────────────────────────────────────────────────────────

function AnalysisResults({ result }: { result: AnalysisResult }) {
  return (
    <div className="flex flex-col gap-8">
      {(result.visit_date || result.provider) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-meta text-ink-secondary">
          {result.visit_date && (
            <span>
              <span className="text-ink-primary font-bold">Visit date:</span>{" "}
              {result.visit_date}
            </span>
          )}
          {result.provider && (
            <span>
              <span className="text-ink-primary font-bold">Provider:</span>{" "}
              {result.provider}
            </span>
          )}
        </div>
      )}

      {/* Section 1 — Plain language timeline */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-1 rounded-full bg-brand" />
          <h2 className="text-card text-ink-primary">What the doctor's notes say</h2>
        </div>
        <p className="mb-5 text-meta text-ink-secondary -mt-2">
          Your visit notes in plain language. Hover any{" "}
          <span className="underline decoration-dotted underline-offset-4 text-brand font-medium cursor-help">
            highlighted word
          </span>{" "}
          for a quick explanation.
        </p>

        {result.timeline.length === 0 ? (
          <div className="glass rounded-card px-5 py-4 text-meta text-ink-secondary">
            No sections could be extracted from this document.
          </div>
        ) : (
          <TimelineGrid items={result.timeline} />
        )}
      </section>

      {/* Section 2 — Profile comparison */}
      {result.comparisons.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <div className="h-8 w-1 rounded-full bg-sea-deep" />
            <h2 className="text-card text-ink-primary">How this applies to you</h2>
          </div>
          <p className="mb-5 text-meta text-ink-secondary -mt-2">
            Each recommendation from the doctor, checked against your medications, labs, and history.
            Hover any highlighted word for more context.
          </p>

          <ComparisonList comparisons={result.comparisons} />

          <div className="mt-6 rounded-card bg-surface-inset px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-ink-secondary" />
            <p className="text-meta text-ink-secondary leading-relaxed">
              This is context, not medical advice. Your clinician has the full picture.
              For anything urgent, call your provider or{" "}
              <span className="text-ink-primary font-bold">Trans Lifeline 877-565-8860</span>.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

// ── Timeline grid + drawer ────────────────────────────────────────────────────

function TimelineGrid({ items }: { items: TimelineItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const activeItem = activeIndex !== null ? items[activeIndex] : null;

  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (activeIndex !== null && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setActiveIndex(null);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [activeIndex]);

  return (
    <>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <TimelineCard
            key={i}
            index={i}
            item={item}
            isActive={activeIndex === i}
            onOpen={() => setActiveIndex(activeIndex === i ? null : i)}
          />
        ))}
      </div>

      {/* Drawer panel — no backdrop, everything behind stays interactive */}
      <div
        ref={drawerRef}
        className={cn(
          "fixed top-16 right-0 bottom-0 z-30 w-full max-w-md flex flex-col",
          "border-l border-white/50",
          "shadow-[-8px_0_32px_rgba(15,35,55,0.12)]",
          "bg-white/80 backdrop-blur-xl",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
          activeItem ? "translate-x-0" : "translate-x-full"
        )}
        role="complementary"
        aria-label="Section detail"
      >
        {activeItem && (
          <>
            {/* Drawer header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-black/[0.06]">
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 shrink-0 rounded-full bg-brand/15 text-brand text-meta font-bold flex items-center justify-center">
                  {activeIndex! + 1}
                </div>
                <h3 className="text-body font-bold text-ink-primary leading-snug">
                  {activeItem.heading}
                </h3>
              </div>
              <button
                onClick={() => setActiveIndex(null)}
                className="shrink-0 text-ink-secondary hover:text-ink-primary transition-colors mt-0.5"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Drawer body — terms shown as cards, no hover tooltips to avoid clipping */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className="text-meta text-ink-secondary leading-relaxed">
                <AnnotatedText text={activeItem.plain} terms={[]} bold />
              </p>

              {activeItem.terms.length > 0 && (
                <div className="mt-6 flex flex-col gap-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] font-semibold text-ink-secondary/50">
                    Terms in this section
                  </p>
                  {activeItem.terms.map((t, i) => (
                    <div key={i} className="rounded-xl border border-black/[0.06] bg-white/60 px-4 py-3">
                      <p className="text-meta font-semibold text-ink-primary">{t.word}</p>
                      <p className="mt-0.5 text-meta text-ink-secondary leading-relaxed">{t.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function TimelineCard({
  index,
  item,
  isActive,
  onOpen,
}: {
  index: number;
  item: TimelineItem;
  isActive: boolean;
  onOpen: () => void;
}) {
  const [clickFlash, setClickFlash] = useState(false);

  function handleOpen() {
    setClickFlash(true);
    setTimeout(() => setClickFlash(false), 380);
    onOpen();
  }

  return (
    <div
      className={cn(
        "glass rounded-card p-6 flex gap-5 h-full transition-shadow duration-200",
        isActive && "ring-1 ring-brand/40"
      )}
    >
      <div className="flex-shrink-0 flex items-start pt-0.5">
        <div className="h-7 w-7 rounded-full bg-brand/15 text-brand text-meta font-bold flex items-center justify-center">
          {index + 1}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-body text-ink-primary font-bold">{item.heading}</h3>
          <button
            onClick={handleOpen}
            className={cn(
              "shrink-0 text-meta transition-colors duration-150 select-none whitespace-nowrap",
              isActive
                ? "text-brand"
                : clickFlash
                  ? "animate-show-more-click"
                  : "text-ink-secondary hover:text-brand"
            )}
          >
            {isActive ? "Show less" : "Show more…"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Comparison list ───────────────────────────────────────────────────────────

function ComparisonList({ comparisons }: { comparisons: Comparison[] }) {
  return (
    <div className="flex flex-col gap-3">
      {comparisons.map((c, i) => (
        <ComparisonCard key={i} comparison={c} />
      ))}
    </div>
  );
}

// ── Comparison card ───────────────────────────────────────────────────────────

const ALIGNMENT_META = {
  aligned: {
    icon: CheckCircle2,
    color: "text-status-protected",
    border: "border-l-status-protected",
    bg: "bg-status-protected/8",
    badge: "bg-status-protected/15 text-status-protected",
    label: "Consistent with your data",
  },
  concern: {
    icon: AlertTriangle,
    color: "text-status-restricted",
    border: "border-l-status-restricted",
    bg: "bg-status-restricted/8",
    badge: "bg-status-restricted/15 text-status-restricted",
    label: "Worth understanding",
  },
  neutral: {
    icon: HelpCircle,
    color: "text-ink-secondary",
    border: "border-l-[rgba(0,0,0,0.08)]",
    bg: "",
    badge: "bg-surface-inset text-ink-secondary",
    label: "No data to compare",
  },
};

function ComparisonCard({ comparison }: { comparison: Comparison }) {
  const meta = ALIGNMENT_META[comparison.alignment] ?? ALIGNMENT_META.neutral;
  const Icon = meta.icon;

  return (
    <div
      className={cn(
        "rounded-card border border-divider border-l-4 px-5 py-4",
        meta.border,
        meta.bg
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", meta.color)} />

        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "text-meta px-2 py-0.5 rounded-chip font-bold uppercase tracking-[0.08em]",
              meta.badge
            )}
          >
            {meta.label}
          </span>

          <p className="mt-2 text-body text-ink-primary font-medium leading-snug">
            {comparison.headline}
          </p>

          <p className="mt-1 text-meta text-ink-secondary italic">
            Doctor said: {comparison.recommendation}
          </p>

          <p className="mt-3 text-meta text-ink-primary leading-relaxed">
            <AnnotatedText
              text={comparison.detail}
              terms={comparison.terms ?? []}
              bold
            />
          </p>

          <a
            href={`/trajectory?tab=testable&rec=${encodeURIComponent(comparison.detail)}`}
            className="mt-3 inline-flex items-center gap-1.5 text-meta font-medium text-brand hover:text-brand/70 transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            View how this could affect you
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Inline term tooltip ───────────────────────────────────────────────────────

function InlineTerm({ word, explanation }: { word: string; explanation: string }) {
  const [show, setShow] = useState(false);

  return (
    <span className="relative inline-block">
      <span
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        tabIndex={0}
        className="underline decoration-dotted underline-offset-4 cursor-help text-brand font-medium focus:outline-none"
      >
        {word}
      </span>
      {show && (
        <span
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 w-60 rounded-card bg-ink-primary text-white text-meta leading-relaxed px-4 py-3 shadow-cardHover pointer-events-none"
        >
          {explanation}
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-ink-primary rotate-45" />
        </span>
      )}
    </span>
  );
}

/**
 * Renders plain text with:
 * - `**word**` markers → <strong> (when bold=true)
 * - term matches → <InlineTerm> tooltip
 * Processing order: bold first (so **drug name** → strong + term tooltip inside)
 */
function AnnotatedText({
  text,
  terms,
  bold = false,
}: {
  text: string;
  terms: TermDef[];
  bold?: boolean;
}) {
  // Step 1: split on **…** markers
  const boldParts: Array<{ text: string; strong: boolean }> = [];
  if (bold) {
    const segments = text.split(/\*\*([^*]+)\*\*/g);
    segments.forEach((seg, i) => {
      if (seg) boldParts.push({ text: seg, strong: i % 2 === 1 });
    });
  } else {
    boldParts.push({ text, strong: false });
  }

  // Step 2: within each segment, split on term matches
  const filtered = terms.filter((t) => t.word && t.explanation);

  function annotateSegment(raw: string, isStrong: boolean, keyPrefix: string) {
    if (!filtered.length) {
      return isStrong ? <strong key={keyPrefix}>{raw}</strong> : <span key={keyPrefix}>{raw}</span>;
    }
    const escaped = filtered.map((t) =>
      t.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    );
    const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");
    const parts = raw.split(pattern);

    const inner = parts
      .filter((p) => p)
      .map((part, i) => {
        const term = filtered.find(
          (t) => t.word.toLowerCase() === part.toLowerCase()
        );
        return term ? (
          <InlineTerm key={`${keyPrefix}-t${i}`} word={part} explanation={term.explanation} />
        ) : (
          <span key={`${keyPrefix}-s${i}`}>{part}</span>
        );
      });

    return isStrong ? <strong key={keyPrefix}>{inner}</strong> : <>{inner}</>;
  }

  return (
    <>
      {boldParts.map((bp, i) =>
        annotateSegment(bp.text, bp.strong, `bp${i}`)
      )}
    </>
  );
}
