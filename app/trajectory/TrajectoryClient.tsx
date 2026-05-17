"use client";

import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { cn } from "@/lib/cn";
import { emptyProfile, loadProfile, type LabValue, type Profile } from "@/lib/profile";
import { listAnalyses, getAnalysis } from "@/lib/analysisStore";
import { Activity, AlertTriangle, FlaskConical, Plus, TrendingUp, X } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DataPoint {
  ts: number;
  actual?: number;
  trend?: number;
  projected?: number;
  hypothetical?: number;
}

interface Metric {
  name: string;
  unit: string;
  points: DataPoint[];
  normalLow?: number;
  normalHigh?: number;
  rangeLabel?: string;
}

interface TestConfig {
  id: string;
  metricName: string;
  hypoValue: string;
  offset: string;
}

type ProjectionStatus = "on-track" | "drifting" | "at-risk" | "unknown";

// ── Normal ranges ─────────────────────────────────────────────────────────────

const RANGES: Record<string, { low: number; high: number; label?: string }> = {
  "estradiol":         { low: 100, high: 300,  label: "HRT target" },
  "estrogen":          { low: 100, high: 300,  label: "HRT target" },
  "testosterone":      { low: 0,   high: 50,   label: "HRT target" },
  "prolactin":         { low: 2,   high: 29 },
  "potassium":         { low: 3.5, high: 5.1 },
  "sodium":            { low: 136, high: 145 },
  "glucose":           { low: 70,  high: 100 },
  "creatinine":        { low: 0.6, high: 1.2 },
  "ast":               { low: 10,  high: 40 },
  "alt":               { low: 7,   high: 56 },
  "cholesterol":       { low: 0,   high: 200 },
  "total cholesterol": { low: 0,   high: 200 },
  "hdl":               { low: 40,  high: 90 },
  "ldl":               { low: 0,   high: 100 },
  "tsh":               { low: 0.4, high: 4.0 },
  "vitamin d":         { low: 30,  high: 100 },
  "25-oh vitamin d":   { low: 30,  high: 100 },
  "hemoglobin":        { low: 11.5,high: 15.5 },
  "hematocrit":        { low: 34,  high: 46 },
};

function lookupRange(name: string) {
  const key = name.toLowerCase().trim();
  return RANGES[key] ?? Object.entries(RANGES).find(([k]) => key.includes(k))?.[1];
}

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_METRICS: Metric[] = (() => {
  const d = (s: string) => new Date(s).getTime();
  return [
    {
      name: "Estradiol", unit: "pg/mL",
      normalLow: 100, normalHigh: 300, rangeLabel: "HRT target",
      points: [
        { ts: d("2024-03-01"), actual: 62 },
        { ts: d("2024-06-01"), actual: 128 },
        { ts: d("2024-09-01"), actual: 195 },
        { ts: d("2024-12-01"), actual: 238 },
        { ts: d("2025-03-01"), actual: 256 },
      ],
    },
    {
      name: "Testosterone", unit: "ng/dL",
      normalLow: 0, normalHigh: 50, rangeLabel: "HRT target",
      points: [
        { ts: d("2024-03-01"), actual: 342 },
        { ts: d("2024-06-01"), actual: 198 },
        { ts: d("2024-09-01"), actual: 85 },
        { ts: d("2024-12-01"), actual: 38 },
        { ts: d("2025-03-01"), actual: 22 },
      ],
    },
    {
      name: "Vitamin D", unit: "ng/mL",
      normalLow: 30, normalHigh: 100,
      points: [
        { ts: d("2024-06-01"), actual: 18 },
        { ts: d("2024-09-01"), actual: 24 },
        { ts: d("2025-01-01"), actual: 34 },
        { ts: d("2025-04-01"), actual: 42 },
      ],
    },
  ];
})();

// ── Math ──────────────────────────────────────────────────────────────────────

function linearReg(pts: { x: number; y: number }[]) {
  const n = pts.length;
  if (n < 2) return null;
  const sx = pts.reduce((s, p) => s + p.x, 0);
  const sy = pts.reduce((s, p) => s + p.y, 0);
  const sxy = pts.reduce((s, p) => s + p.x * p.y, 0);
  const sx2 = pts.reduce((s, p) => s + p.x * p.x, 0);
  const d = n * sx2 - sx * sx;
  if (d === 0) return null;
  const m = (n * sxy - sx * sy) / d;
  const b = (sy - m * sx) / n;
  return { m, b };
}

function enrich(metric: Metric): Metric {
  const real = metric.points.filter(p => p.actual !== undefined);
  if (real.length < 2) return metric;
  const reg = linearReg(real.map(p => ({ x: p.ts / 1e10, y: p.actual! })));
  if (!reg) return metric;
  const { m, b } = reg;
  const withTrend = metric.points.map(p => ({ ...p, trend: m * (p.ts / 1e10) + b }));
  const lastTs = Math.max(...real.map(p => p.ts));
  const mo3 = lastTs + 90 * 86400000;
  const mo6 = lastTs + 180 * 86400000;
  withTrend.push(
    { ts: mo3, trend: m * (mo3 / 1e10) + b, projected: m * (mo3 / 1e10) + b },
    { ts: mo6, trend: m * (mo6 / 1e10) + b, projected: m * (mo6 / 1e10) + b },
  );
  return { ...metric, points: withTrend.sort((a, b) => a.ts - b.ts) };
}

function getProjectionStatus(metric: Metric): ProjectionStatus {
  if (metric.normalLow === undefined || metric.normalHigh === undefined) return "unknown";
  const projPts = metric.points.filter(p => p.projected !== undefined);
  if (!projPts.length) return "unknown";
  const lastProj = projPts[projPts.length - 1].projected!;
  const projInRange = lastProj >= metric.normalLow && lastProj <= metric.normalHigh;
  const actualPts = metric.points.filter(p => p.actual !== undefined);
  const lastActual = actualPts.length ? actualPts[actualPts.length - 1].actual! : null;
  const actualInRange = lastActual !== null
    ? lastActual >= metric.normalLow && lastActual <= metric.normalHigh
    : null;
  if (projInRange) return "on-track";
  if (actualInRange === true) return "drifting";
  return "at-risk";
}

const PROJ_STATUS_META: Record<ProjectionStatus, { label: string; cls: string; projColor: string }> = {
  "on-track": { label: "On track", cls: "bg-emerald-100 text-emerald-700", projColor: "#10b981" },
  "drifting":  { label: "Drifting",  cls: "bg-amber-100 text-amber-700",   projColor: "#f59e0b" },
  "at-risk":   { label: "At risk",   cls: "bg-red-100 text-red-600",       projColor: "#ef4444" },
  "unknown":   { label: "",          cls: "",                               projColor: "#7dd3fc" },
};

// ── Lab extraction from analysis ──────────────────────────────────────────────

const LAB_ALIASES: [string, string, string][] = [
  ["estradiol|\\be2\\b", "Estradiol", "pg/mL"],
  ["testosterone", "Testosterone", "ng/dL"],
  ["vitamin\\s+d|25-oh", "Vitamin D", "ng/mL"],
  ["prolactin", "Prolactin", "ng/mL"],
  ["potassium", "Potassium", "mEq/L"],
  ["sodium", "Sodium", "mEq/L"],
  ["glucose", "Glucose", "mg/dL"],
  ["creatinine", "Creatinine", "mg/dL"],
  ["\\bast\\b", "AST", "U/L"],
  ["\\balt\\b", "ALT", "U/L"],
  ["cholesterol", "Cholesterol", "mg/dL"],
  ["\\bhdl\\b", "HDL", "mg/dL"],
  ["\\bldl\\b", "LDL", "mg/dL"],
  ["\\btsh\\b", "TSH", "mIU/L"],
  ["hemoglobin", "Hemoglobin", "g/dL"],
  ["hematocrit", "Hematocrit", "%"],
];

const UNIT_CAP = "(pg\\/mL|ng\\/dL|ng\\/mL|mIU\\/L|mEq\\/L|mg\\/dL|mmol\\/L|IU\\/L|g\\/dL|%|U\\/L)";

function extractLabsFromAnalysis(result: any): LabValue[] {
  const visitDate: string = result.visit_date ?? new Date().toISOString().split("T")[0];
  const allText = [
    ...(result.timeline ?? []).map((t: any) => t.plain ?? ""),
    ...(result.comparisons ?? []).map((c: any) => `${c.detail ?? ""} ${c.recommendation ?? ""}`),
  ].join(" ");

  const labs: LabValue[] = [];
  const seen = new Set<string>();

  for (const [alias, canonical, defaultUnit] of LAB_ALIASES) {
    const re = new RegExp(`(?:${alias})[^0-9]{0,40}?(\\d+(?:\\.\\d+)?)\\s*${UNIT_CAP}?`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(allText)) !== null) {
      const value = m[1];
      const unit = m[2] ?? defaultUnit;
      const key = `${canonical}:${value}`;
      if (!seen.has(key)) {
        seen.add(key);
        labs.push({ id: `analysis-${canonical}-${labs.length}`, name: canonical, value, unit, date: visitDate });
      }
    }
  }
  return labs;
}

// ── Build metrics from LabValue array ─────────────────────────────────────────

function buildMetrics(labs: LabValue[]): Metric[] {
  const grouped: Record<string, { unit: string; pts: { ts: number; val: number }[] }> = {};
  for (const lab of labs) {
    const val = parseFloat(lab.value);
    const ts = new Date(lab.date).getTime();
    if (isNaN(val) || isNaN(ts)) continue;
    const k = lab.name.trim();
    if (!grouped[k]) grouped[k] = { unit: lab.unit, pts: [] };
    grouped[k].pts.push({ ts, val });
  }
  return Object.entries(grouped)
    .filter(([, g]) => g.pts.length > 0)
    .map(([name, g]) => {
      const range = lookupRange(name);
      return {
        name, unit: g.unit,
        normalLow: range?.low, normalHigh: range?.high, rangeLabel: range?.label,
        points: g.pts.sort((a, b) => a.ts - b.ts).map(e => ({ ts: e.ts, actual: e.val })),
      };
    });
}

// ── Formatting ────────────────────────────────────────────────────────────────

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function yDomain(metric: Metric, extra?: number): [number, number] {
  const vals: number[] = metric.points
    .flatMap(p => [p.actual, p.trend, p.projected, p.hypothetical].filter((v): v is number => v !== undefined));
  if (extra !== undefined) vals.push(extra);
  if (metric.normalLow !== undefined) vals.push(metric.normalLow);
  if (metric.normalHigh !== undefined) vals.push(metric.normalHigh);
  if (!vals.length) return [0, 100];
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = ((hi - lo) * 0.25) || hi * 0.25 || 10;
  return [Math.max(0, lo - pad), hi + pad];
}

// ── Chart colors ──────────────────────────────────────────────────────────────

const C = {
  actual:       "#218cff",
  trend:        "#0284c7",
  band:         "rgba(186,230,253,0.35)",
  bandStroke:   "#7dd3fc",
  hypothetical: "#f59e0b",
};

// ── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-xl px-3 py-2.5 text-meta shadow-xl border border-white/60">
      <p className="font-semibold text-ink-primary mb-1.5 text-[12px] uppercase tracking-wide">
        {fmtDate(Number(label))}
      </p>
      {payload.map((p: any) =>
        p.value != null && (
          <p key={p.dataKey} className="tabular-nums" style={{ color: p.color }}>
            {p.name}: <strong>{Math.round(p.value * 10) / 10}</strong> {unit}
          </p>
        )
      )}
    </div>
  );
}

// ── MetricChart ───────────────────────────────────────────────────────────────

function MetricChart({ metric, hypothetical, highlighted = false }: {
  metric: Metric;
  hypothetical?: { ts: number; value: number };
  highlighted?: boolean;
}) {
  const [flashActive, setFlashActive] = useState(false);
  const prevHighlighted = useRef(false);

  useEffect(() => {
    if (highlighted && !prevHighlighted.current) {
      setFlashActive(true);
      const t = setTimeout(() => setFlashActive(false), 2000);
      return () => clearTimeout(t);
    }
    prevHighlighted.current = highlighted;
  }, [highlighted]);

  const data = hypothetical
    ? [...metric.points, { ts: hypothetical.ts, hypothetical: hypothetical.value }].sort((a, b) => a.ts - b.ts)
    : metric.points;

  const domain = yDomain(metric, hypothetical?.value);
  const hasProjection = data.some(p => p.projected !== undefined);
  const projStatus = getProjectionStatus(metric);
  const statusMeta = PROJ_STATUS_META[projStatus];
  const projColor = statusMeta.projColor;

  // Find the timestamp where projection begins (last actual point)
  const actualPts = metric.points.filter(p => p.actual !== undefined);
  const projStartTs = actualPts.length ? Math.max(...actualPts.map(p => p.ts)) : null;
  const projEndTs = hasProjection ? Math.max(...data.filter(p => p.projected !== undefined).map(p => p.ts)) : null;

  return (
    <div
      className="glass rounded-card p-5 transition-[box-shadow] duration-[1800ms]"
      style={flashActive ? { boxShadow: "0 0 0 3px rgba(234,179,8,0.8), 0 0 24px rgba(234,179,8,0.35)", transition: "none" } : undefined}
    >
      <div className="flex items-start justify-between mb-3 gap-4">
        <div>
          <h3 className="text-body font-bold text-ink-primary">{metric.name}</h3>
          <p className="text-[13px] text-ink-secondary mt-0.5">
            {metric.unit}
            {metric.rangeLabel && (
              <span className="ml-2 text-brand font-medium">· {metric.rangeLabel}</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {metric.normalLow !== undefined && (
            <div className="text-right text-[12px] text-ink-secondary">
              <p>Target range</p>
              <p className="font-semibold text-ink-primary">
                {metric.normalLow}–{metric.normalHigh} {metric.unit}
              </p>
            </div>
          )}
          {projStatus !== "unknown" && (
            <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", statusMeta.cls)}>
              {statusMeta.label}
            </span>
          )}
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
            <CartesianGrid stroke="rgba(0,0,0,0.05)" strokeDasharray="4 4" vertical={false} />

            {metric.normalLow !== undefined && metric.normalHigh !== undefined && (
              <ReferenceArea
                y1={metric.normalLow} y2={metric.normalHigh}
                fill={C.band} stroke={C.bandStroke} strokeOpacity={0.5} strokeDasharray="4 4"
              />
            )}

            {/* Projection zone background colored by status */}
            {hasProjection && projStartTs && projEndTs && projStatus !== "unknown" && (
              <ReferenceArea
                x1={projStartTs} x2={projEndTs}
                fill={
                  projStatus === "on-track" ? "rgba(16,185,129,0.07)"
                  : projStatus === "drifting" ? "rgba(245,158,11,0.09)"
                  : "rgba(239,68,68,0.09)"
                }
                stroke="none"
              />
            )}

            <XAxis
              dataKey="ts" type="number" scale="time"
              domain={["dataMin", "dataMax"]}
              tickFormatter={fmtDate}
              tick={{ fontSize: 11, fill: "rgba(0,0,0,0.38)" }}
              axisLine={false} tickLine={false} tickCount={5}
            />
            <YAxis
              domain={domain}
              tick={{ fontSize: 11, fill: "rgba(0,0,0,0.38)" }}
              axisLine={false} tickLine={false} width={38}
            />
            <Tooltip content={(props: any) => <ChartTip {...props} unit={metric.unit} />} />

            <Line dataKey="trend" name="Trend"
              stroke={C.trend} strokeWidth={1.5} strokeDasharray="5 3"
              dot={false} activeDot={false} connectNulls
            />
            {hasProjection && (
              <Line dataKey="projected" name="Projection"
                stroke={projColor} strokeWidth={2} strokeDasharray="4 5"
                dot={{ r: 4, fill: projColor, stroke: "white", strokeWidth: 2 }}
                activeDot={false} connectNulls
              />
            )}
            {hypothetical && (
              <Line dataKey="hypothetical" name="What if"
                stroke={C.hypothetical} strokeWidth={0}
                dot={{ r: 7, fill: C.hypothetical, stroke: "white", strokeWidth: 2.5 }}
                activeDot={{ r: 8 }} connectNulls={false}
              />
            )}
            <Line dataKey="actual" name="Measured"
              stroke={C.actual} strokeWidth={2.5}
              dot={{ r: 5, fill: C.actual, stroke: "white", strokeWidth: 2 }}
              activeDot={{ r: 7, fill: C.actual, stroke: "white", strokeWidth: 2 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {projStatus === "at-risk" && (
        <div className="mt-3 rounded-card bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-meta leading-relaxed">
            <div className="text-red-700 font-semibold">
              This pattern isn&apos;t normal — talk to a doctor.
            </div>
            <p className="text-red-700/80 mt-0.5">
              {metric.name} is trending outside the typical range
              {metric.normalLow !== undefined && metric.normalHigh !== undefined
                ? ` (${metric.normalLow}–${metric.normalHigh} ${metric.unit})`
                : ""}{" "}
              and projection stays out. Bring this chart to your next visit, or
              reach out sooner if you&apos;re also feeling off.
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-secondary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[2.5px] w-5 rounded" style={{ background: C.actual }} />
          Measured
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-[1.5px] w-5" style={{ borderTop: `1.5px dashed ${C.trend}` }} />
          Trendline
        </span>
        {hasProjection && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-[1.5px] w-5" style={{ borderTop: `2px dashed ${projColor}` }} />
            Projection
          </span>
        )}
        {metric.normalLow !== undefined && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm border" style={{ background: C.band, borderColor: C.bandStroke }} />
            Target range
          </span>
        )}
        {hypothetical && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: C.hypothetical }} />
            What if
          </span>
        )}
      </div>
    </div>
  );
}

// ── Metric classification ─────────────────────────────────────────────────────

// Metrics tracked specifically because of HRT
const HRT_METRICS = new Set([
  "estradiol", "estrogen", "e2", "testosterone", "prolactin",
  "shbg", "lh", "fsh", "dhea", "dheas",
]);

// Metrics that are general health but may be meaningfully affected by common HRT meds
const SHARED_METRICS = new Set([
  "potassium",       // spironolactone → hyperkalemia risk
  "sodium",          // spiro → hyponatremia risk
  "creatinine",      // muscle mass changes on T affect baseline
  "ast", "alt",      // oral estrogen → liver enzyme elevation
  "hemoglobin", "hematocrit", // testosterone → elevated RBC
]);

// Returns: "hrt" | "shared" | "general"
function classifyMetric(name: string): "hrt" | "shared" | "general" {
  const key = name.toLowerCase().trim();
  if ([...HRT_METRICS].some(k => key.includes(k))) return "hrt";
  if ([...SHARED_METRICS].some(k => key === k || key.includes(k))) return "shared";
  return "general";
}

const SHARED_IMPACT: Record<string, string> = {
  potassium:   "Spironolactone (a common HRT medication) can raise potassium levels.",
  sodium:      "Spironolactone can lower sodium. Worth monitoring alongside your HRT.",
  creatinine:  "Testosterone changes muscle mass, which affects creatinine baselines.",
  ast:         "Oral estrogen is metabolized by the liver and can elevate liver enzymes.",
  alt:         "Oral estrogen is metabolized by the liver and can elevate liver enzymes.",
  hemoglobin:  "Testosterone therapy often raises red blood cell production, increasing hemoglobin.",
  hematocrit:  "Testosterone therapy often raises red blood cell production, increasing hematocrit.",
};

function getSharedImpact(name: string): string | null {
  const key = name.toLowerCase().trim();
  return Object.entries(SHARED_IMPACT).find(([k]) => key === k || key.includes(k))?.[1] ?? null;
}

// ── Live Data tab (HRT) ───────────────────────────────────────────────────────

function HrtTab({ metrics, isDemo, highlightedMetric }: {
  metrics: Metric[];
  isDemo: boolean;
  highlightedMetric?: string;
}) {
  const hrtMetrics = metrics.filter(m => classifyMetric(m.name) === "hrt");
  const display = isDemo ? metrics : hrtMetrics; // demo shows all since they're all HRT
  const enriched = display.map(enrich);

  return (
    <div>
      {isDemo && (
        <div className="mb-6 glass rounded-card px-5 py-4 flex items-start gap-3">
          <FlaskConical className="h-5 w-5 shrink-0 text-brand mt-0.5" />
          <p className="text-meta text-ink-secondary leading-relaxed">
            No hormone lab data found in your profile or saved analyses. These are sample charts.{" "}
            <a href="/places" className="underline underline-offset-4 text-brand">Add your lab values</a>{" "}
            or upload visit notes on the{" "}
            <a href="/analysis" className="underline underline-offset-4 text-brand">After Visit</a>{" "}
            page to see your real trajectory.
          </p>
        </div>
      )}
      {!isDemo && hrtMetrics.length === 0 && (
        <div className="glass rounded-card px-5 py-4 text-meta text-ink-secondary">
          No hormone-specific labs found (estradiol, testosterone, prolactin, etc.).{" "}
          <a href="/places" className="underline underline-offset-4 text-brand">Add them to your profile</a> or upload visit notes.
        </div>
      )}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        {enriched.map(m => (
          <MetricChart
            key={m.name}
            metric={m}
            highlighted={!!highlightedMetric && m.name.toLowerCase() === highlightedMetric.toLowerCase()}
          />
        ))}
      </div>
    </div>
  );
}

// ── Non-HRT tab ───────────────────────────────────────────────────────────────

function NonHrtTab({ metrics, highlightedMetric }: {
  metrics: Metric[];
  highlightedMetric?: string;
}) {
  const nonHrtMetrics = metrics.filter(m => classifyMetric(m.name) !== "hrt");
  const enriched = nonHrtMetrics.map(enrich);

  if (nonHrtMetrics.length === 0) {
    return (
      <div className="glass rounded-card px-5 py-6 text-meta text-ink-secondary">
        No general health labs found (cholesterol, glucose, TSH, etc.).{" "}
        <a href="/places" className="underline underline-offset-4 text-brand">Add them to your profile</a> or upload visit notes.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 glass rounded-card px-5 py-4 flex items-start gap-3">
        <Activity className="h-5 w-5 shrink-0 text-ink-secondary mt-0.5" />
        <p className="text-meta text-ink-secondary leading-relaxed">
          General health labs tracked independently of your hormone therapy.
          Labs marked <span className="text-amber-600 font-semibold">May be HRT-affected</span> can be influenced by your current regimen —
          see the note on each card for context.
        </p>
      </div>
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        {enriched.map(m => {
          const impact = getSharedImpact(m.name);
          return (
            <div key={m.name} className="flex flex-col gap-2">
              {impact && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50/80 border border-amber-200 text-[12px] text-amber-700">
                  <span className="font-semibold shrink-0 mt-0.5">⚠ May be HRT-affected:</span>
                  <span>{impact}</span>
                </div>
              )}
              <MetricChart
                metric={m}
                highlighted={!!highlightedMetric && m.name.toLowerCase() === highlightedMetric.toLowerCase()}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Single test config panel ──────────────────────────────────────────────────

function SingleTestConfig({
  config,
  metrics,
  highlighted,
  onHighlightDone,
  onChange,
  onRemove,
}: {
  config: TestConfig;
  metrics: Metric[];
  highlighted: boolean;
  onHighlightDone: () => void;
  onChange: (patch: Partial<TestConfig>) => void;
  onRemove?: () => void;
}) {
  const metric = metrics.find(m => m.name === config.metricName);
  const enriched = metric ? enrich(metric) : null;

  const hypoTs = Date.now() + parseInt(config.offset) * 86400000;
  const hypoNum = parseFloat(config.hypoValue);
  const hypoPoint = !isNaN(hypoNum) && hypoNum >= 0 ? { ts: hypoTs, value: hypoNum } : undefined;

  const trendAtHypo = (() => {
    if (!metric) return null;
    const real = metric.points.filter(p => p.actual !== undefined);
    if (real.length < 2) return null;
    const reg = linearReg(real.map(p => ({ x: p.ts / 1e10, y: p.actual! })));
    if (!reg) return null;
    return reg.m * (hypoTs / 1e10) + reg.b;
  })();

  const insight = (() => {
    if (trendAtHypo === null || !hypoPoint || !metric) return null;
    const diff = hypoNum - trendAtHypo;
    const pct = Math.abs((diff / trendAtHypo) * 100).toFixed(0);
    const dir = diff > 0 ? "above" : "below";
    const inRange = metric.normalLow !== undefined && metric.normalHigh !== undefined
      ? hypoNum >= metric.normalLow && hypoNum <= metric.normalHigh
      : null;
    return { pct, dir, inRange };
  })();

  // Trigger highlight-done after 2.1 seconds
  useEffect(() => {
    if (highlighted) {
      const t = setTimeout(onHighlightDone, 2100);
      return () => clearTimeout(t);
    }
  }, [highlighted, onHighlightDone]);

  return (
    <div className="flex flex-col gap-4">
      {onRemove && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.12em] font-semibold text-ink-secondary/60">
            Test graph
          </span>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-ink-secondary hover:text-status-banned hover:bg-status-banned/10 transition-colors"
            title="Remove this test graph"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[280px_1fr] items-start">
        {/* Controls */}
        <div className="glass rounded-card p-6 flex flex-col gap-5">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-ink-secondary mb-2">
              Metric
            </label>
            <select
              value={config.metricName}
              onChange={e => onChange({ metricName: e.target.value, hypoValue: "" })}
              className="w-full rounded-btn border border-divider bg-white/60 px-3 py-2 text-body text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
            >
              {metrics.map(m => (
                <option key={m.name} value={m.name}>{m.name} ({m.unit})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-ink-secondary mb-2">
              Hypothetical value{metric && <span className="font-normal normal-case"> ({metric.unit})</span>}
            </label>
            <input
              type="number"
              value={config.hypoValue}
              onChange={e => onChange({ hypoValue: e.target.value })}
              placeholder={metric?.normalHigh !== undefined ? `e.g. ${metric.normalHigh}` : "Enter value"}
              className="w-full rounded-btn border border-divider bg-white/60 px-3 py-2 text-body text-ink-primary focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            {metric?.normalLow !== undefined && (
              <p className="mt-1.5 text-[12px] text-ink-secondary">
                Target: {metric.normalLow}–{metric.normalHigh} {metric.unit}
                {metric.rangeLabel && ` · ${metric.rangeLabel}`}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-ink-secondary mb-2">
              When
            </label>
            <div className="flex gap-2 flex-wrap">
              {[["30","1 mo"],["90","3 mo"],["180","6 mo"],["365","1 yr"]].map(([val, label]) => (
                <button key={val} onClick={() => onChange({ offset: val })}
                  className={cn(
                    "px-3 py-1.5 rounded-btn text-meta font-medium transition-colors",
                    config.offset === val ? "bg-brand text-white" : "glass text-ink-secondary hover:text-brand"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {insight && (
            <div className={cn(
              "rounded-xl px-4 py-3 text-meta leading-relaxed border",
              insight.inRange === true
                ? "bg-emerald-50/80 text-emerald-700 border-emerald-200"
                : insight.inRange === false
                  ? "bg-amber-50/80 text-amber-700 border-amber-200"
                  : "bg-surface-inset text-ink-secondary border-divider"
            )}>
              This value is <strong>{insight.pct}% {insight.dir}</strong> your projected trendline.
              {insight.inRange === true && " It falls within the target range."}
              {insight.inRange === false && " It falls outside the target range."}
            </div>
          )}

          {!hypoPoint && (
            <p className="text-[12px] text-ink-secondary italic">
              Enter a hypothetical value above to see how it compares to your trend.
            </p>
          )}
        </div>

        {/* Chart */}
        {enriched ? (
          <MetricChart metric={enriched} hypothetical={hypoPoint} highlighted={highlighted} />
        ) : (
          <div className="glass rounded-card p-8 text-center text-meta text-ink-secondary">
            Select a metric to see the chart.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Testable Data tab ─────────────────────────────────────────────────────────

function TestableDataTab({ metrics, initialMetric }: { metrics: Metric[]; initialMetric?: string }) {
  const [recContext, setRecContext] = useState<string | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [configs, setConfigs] = useState<TestConfig[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !metrics.length) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const rec = params.get("rec");
    if (rec) setRecContext(decodeURIComponent(rec));

    const metricParam = params.get("metric") ?? initialMetric ?? "";
    const startMetric = metricParam
      ? (metrics.find(m => m.name.toLowerCase() === metricParam.toLowerCase())?.name ?? metrics[0]?.name ?? "")
      : (metrics[0]?.name ?? "");

    const firstId = `cfg-${Date.now()}`;
    setConfigs([{ id: firstId, metricName: startMetric, hypoValue: "", offset: "90" }]);

    if (metricParam) setHighlightedId(firstId);
  }, [metrics, initialMetric]);

  function addConfig() {
    setConfigs(prev => [
      ...prev,
      { id: `cfg-${Date.now()}`, metricName: metrics[0]?.name ?? "", hypoValue: "", offset: "90" },
    ]);
  }

  function updateConfig(id: string, patch: Partial<TestConfig>) {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  }

  function removeConfig(id: string) {
    setConfigs(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div>
      {recContext && (
        <div className="mb-6 glass rounded-card px-5 py-4 border-l-4 border-brand">
          <p className="text-[11px] uppercase tracking-[0.12em] font-semibold text-brand mb-1.5">
            From your After Visit notes
          </p>
          <p className="text-meta text-ink-secondary leading-relaxed">{recContext}</p>
        </div>
      )}

      <div className="flex flex-col gap-10">
        {configs.map((cfg, idx) => (
          <SingleTestConfig
            key={cfg.id}
            config={cfg}
            metrics={metrics}
            highlighted={highlightedId === cfg.id}
            onHighlightDone={() => setHighlightedId(null)}
            onChange={patch => updateConfig(cfg.id, patch)}
            onRemove={configs.length > 1 || idx > 0 ? () => removeConfig(cfg.id) : undefined}
          />
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={addConfig}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-card glass border border-divider text-body font-semibold text-ink-secondary hover:text-brand hover:border-brand/40 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add test graph
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = "hrt" | "nonhrt" | "testable";

export function TrajectoryClient() {
  const [tab, setTab] = useState<Tab>("hrt");
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [analysisLabs, setAnalysisLabs] = useState<LabValue[]>([]);
  const [highlightedMetric, setHighlightedMetric] = useState<string | undefined>(undefined);

  useEffect(() => {
    setProfile(loadProfile());

    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab");
    if (tabParam === "testable") setTab("testable");
    else if (tabParam === "nonhrt") setTab("nonhrt");
    const metricParam = params.get("metric");
    if (metricParam) setHighlightedMetric(decodeURIComponent(metricParam));

    // Load labs from the most recent saved analysis
    listAnalyses().then(async (list) => {
      if (!list.length) return;
      const latest = await getAnalysis(list[0].id);
      if (latest) {
        setAnalysisLabs(extractLabsFromAnalysis(latest.result));
      }
    }).catch(() => {});
  }, []);

  // Merge profile labs + extracted analysis labs
  const allLabs = [...profile.recent_labs, ...analysisLabs];
  const userMetrics = buildMetrics(allLabs);
  const metrics = userMetrics.length > 0 ? userMetrics : DEMO_METRICS;
  const isDemo = userMetrics.length === 0;

  const TABS = [
    { id: "hrt",      label: "HRT",          Icon: TrendingUp  },
    { id: "nonhrt",   label: "Non-HRT",      Icon: Activity    },
    { id: "testable", label: "Testable Data", Icon: FlaskConical },
  ] as const;

  return (
    <div className="page-ocean">
      <PageHero
        title="Data Trajectory"
        description="Track your lab values over time, see where your numbers are heading, and test how changes could shift your trendline."
      />

      <Container className="pb-20">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 glass rounded-[14px] w-fit mb-8">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[15px] font-semibold transition-all duration-200",
                tab === id
                  ? "bg-white/90 text-sea-ink shadow-sm"
                  : "text-ink-secondary hover:text-ink-primary"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === "hrt" && (
          <HrtTab
            metrics={metrics}
            isDemo={isDemo}
            highlightedMetric={highlightedMetric}
          />
        )}
        {tab === "nonhrt" && (
          <NonHrtTab
            metrics={metrics}
            highlightedMetric={highlightedMetric}
          />
        )}
        {tab === "testable" && (
          <TestableDataTab
            metrics={metrics}
            initialMetric={highlightedMetric}
          />
        )}
      </Container>
    </div>
  );
}
