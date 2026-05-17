"use client";

import { useEffect, useState } from "react";
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
import { FlaskConical, TrendingUp } from "lucide-react";

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

// ── Normal ranges ─────────────────────────────────────────────────────────────

const RANGES: Record<string, { low: number; high: number; label?: string }> = {
  "estradiol":        { low: 100, high: 300,  label: "HRT target" },
  "estrogen":         { low: 100, high: 300,  label: "HRT target" },
  "testosterone":     { low: 0,   high: 50,   label: "HRT target" },
  "prolactin":        { low: 2,   high: 29 },
  "potassium":        { low: 3.5, high: 5.1 },
  "sodium":           { low: 136, high: 145 },
  "glucose":          { low: 70,  high: 100 },
  "creatinine":       { low: 0.6, high: 1.2 },
  "ast":              { low: 10,  high: 40 },
  "alt":              { low: 7,   high: 56 },
  "cholesterol":      { low: 0,   high: 200 },
  "total cholesterol":{ low: 0,   high: 200 },
  "hdl":              { low: 40,  high: 90 },
  "ldl":              { low: 0,   high: 100 },
  "tsh":              { low: 0.4, high: 4.0 },
  "vitamin d":        { low: 30,  high: 100 },
  "25-oh vitamin d":  { low: 30,  high: 100 },
  "hemoglobin":       { low: 11.5,high: 15.5 },
  "hematocrit":       { low: 34,  high: 46 },
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
  projected:    "#7dd3fc",
  hypothetical: "#f59e0b",
  band:         "rgba(186,230,253,0.35)",
  bandStroke:   "#7dd3fc",
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

function MetricChart({ metric, hypothetical }: {
  metric: Metric;
  hypothetical?: { ts: number; value: number };
}) {
  const data = hypothetical
    ? [...metric.points, { ts: hypothetical.ts, hypothetical: hypothetical.value }].sort((a, b) => a.ts - b.ts)
    : metric.points;

  const domain = yDomain(metric, hypothetical?.value);
  const hasProjection = data.some(p => p.projected !== undefined);

  return (
    <div className="glass rounded-card p-5">
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
        {metric.normalLow !== undefined && (
          <div className="text-right text-[12px] text-ink-secondary shrink-0">
            <p>Target range</p>
            <p className="font-semibold text-ink-primary">
              {metric.normalLow}–{metric.normalHigh} {metric.unit}
            </p>
          </div>
        )}
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
                stroke={C.projected} strokeWidth={1.5} strokeDasharray="3 4"
                dot={false} activeDot={false} connectNulls
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
            <span className="inline-block h-[1.5px] w-5" style={{ borderTop: `1.5px dashed ${C.projected}` }} />
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

// ── Live Data tab ─────────────────────────────────────────────────────────────

function LiveDataTab({ metrics, isDemo }: { metrics: Metric[]; isDemo: boolean }) {
  const enriched = metrics.map(enrich);
  return (
    <div>
      {isDemo && (
        <div className="mb-6 glass rounded-card px-5 py-4 flex items-start gap-3">
          <FlaskConical className="h-5 w-5 shrink-0 text-brand mt-0.5" />
          <p className="text-meta text-ink-secondary leading-relaxed">
            No lab data found in your profile. These are sample charts.{" "}
            <a href="/places" className="underline underline-offset-4 text-brand">Add your lab values</a>{" "}
            to see your real trajectory and projections.
          </p>
        </div>
      )}
      <div className="grid gap-5 grid-cols-1 md:grid-cols-2">
        {enriched.map(m => <MetricChart key={m.name} metric={m} />)}
      </div>
    </div>
  );
}

// ── Testable Data tab ─────────────────────────────────────────────────────────

function TestableDataTab({ metrics }: { metrics: Metric[] }) {
  const [selected, setSelected] = useState(metrics[0]?.name ?? "");
  const [hypoValue, setHypoValue] = useState("");
  const [offset, setOffset] = useState("90");
  const [recContext, setRecContext] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const rec = params.get("rec");
    if (rec) setRecContext(decodeURIComponent(rec));
  }, []);

  const metric = metrics.find(m => m.name === selected);
  const enriched = metric ? enrich(metric) : null;

  const hypoTs = Date.now() + parseInt(offset) * 86400000;
  const hypoNum = parseFloat(hypoValue);
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

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[280px_1fr] items-start">
        {/* Controls */}
        <div className="glass rounded-card p-6 flex flex-col gap-5">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.12em] font-semibold text-ink-secondary mb-2">
              Metric
            </label>
            <select
              value={selected}
              onChange={e => { setSelected(e.target.value); setHypoValue(""); }}
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
              value={hypoValue}
              onChange={e => setHypoValue(e.target.value)}
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
                <button key={val} onClick={() => setOffset(val)}
                  className={cn(
                    "px-3 py-1.5 rounded-btn text-meta font-medium transition-colors",
                    offset === val ? "bg-brand text-white" : "glass text-ink-secondary hover:text-brand"
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
          <MetricChart metric={enriched} hypothetical={hypoPoint} />
        ) : (
          <div className="glass rounded-card p-8 text-center text-meta text-ink-secondary">
            Select a metric to see the chart.
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

type Tab = "live" | "testable";

export function TrajectoryClient() {
  const [tab, setTab] = useState<Tab>("live");
  const [profile, setProfile] = useState<Profile>(emptyProfile());

  useEffect(() => {
    setProfile(loadProfile());
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "testable") setTab("testable");
  }, []);

  const userMetrics = buildMetrics(profile.recent_labs);
  const metrics = userMetrics.length > 0 ? userMetrics : DEMO_METRICS;
  const isDemo = userMetrics.length === 0;

  return (
    <div className="page-ocean">
      <PageHero
        title="Data Trajectory"
        description="Track your lab values over time, see where your numbers are heading, and test how changes could shift your trendline."
      />

      <Container className="pb-20">
        {/* Tab switcher */}
        <div className="flex gap-1 p-1 glass rounded-[14px] w-fit mb-8">
          {([["live", "Live Data", TrendingUp], ["testable", "Testable Data", FlaskConical]] as const).map(
            ([id, label, Icon]) => (
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
            )
          )}
        </div>

        {tab === "live" && <LiveDataTab metrics={metrics} isDemo={isDemo} />}
        {tab === "testable" && <TestableDataTab metrics={metrics} />}
      </Container>
    </div>
  );
}
