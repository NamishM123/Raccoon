"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  LineChart,
  Sparkles,
  Activity,
  Database,
  Plus,
  Trash2,
} from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/cn";
import {
  emptyProfile,
  loadProfile,
  newId,
  saveProfile,
  type LabValue,
  type Profile,
} from "@/lib/profile";
import {
  describeDays,
  noiseBand,
  parseDate,
  projectThreshold,
  regress,
  slopePerMonth,
  type LabPoint,
} from "@/lib/trends";
import { LAB_THRESHOLDS, thresholdFor } from "@/data/lab_thresholds";

interface PercentilePayload {
  lab: string;
  regimen_label: string;
  percentile: number;
  n: number;
  mean: number;
  sd: number;
}

export function TrendsClient() {
  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveProfile(profile);
  }, [profile, loaded]);

  // Group labs by lab name (lowercased), filter out entries without a parseable date or value.
  const grouped = useMemo(() => groupLabs(profile.recent_labs), [profile.recent_labs]);
  const groups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  function loadDemo() {
    if (
      profile.recent_labs.length > 0 &&
      !confirm("Replace your current labs with the demo trajectory dataset?")
    )
      return;
    setProfile((p) => ({
      ...p,
      hormone_regimen_summary:
        p.hormone_regimen_summary ||
        "Testosterone cypionate 100 mg IM weekly, started 2020.",
      medications:
        p.medications.length > 0
          ? p.medications
          : [
              { id: newId(), description: "Testosterone cypionate 100 mg IM weekly since 2020" },
            ],
      recent_labs: SEED_LABS.map((l) => ({ ...l, id: newId() })),
    }));
  }

  function addLabEntry() {
    setProfile((p) => ({
      ...p,
      recent_labs: [
        ...p.recent_labs,
        { id: newId(), name: "", value: "", unit: "", date: "" },
      ],
    }));
  }

  function updateLab(id: string, patch: Partial<LabValue>) {
    setProfile((p) => ({
      ...p,
      recent_labs: p.recent_labs.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }

  function removeLab(id: string) {
    setProfile((p) => ({
      ...p,
      recent_labs: p.recent_labs.filter((l) => l.id !== id),
    }));
  }

  const alerts = useMemo(() => buildAlerts(grouped), [grouped]);
  const totalReadings = profile.recent_labs.filter((l) => l.value && l.date).length;

  return (
    <div className="page-ocean">
      <PageHero
        eyebrow="Trajectory Alerts"
        title="Catch the slow drift your doctor missed."
        description="Every lab you've ever logged, plotted across time, with a regression line, your personal noise band, and a projection to clinical thresholds. Doctors look at the latest snapshot. This watches the slope."
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-meta text-sea-ink/75">
          <span className="inline-flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="text-ink-primary font-bold">{totalReadings}</span> reading
            {totalReadings === 1 ? "" : "s"} tracked
          </span>
          <span className="inline-flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-ink-primary font-bold">{groups.length}</span> lab
            {groups.length === 1 ? "" : "s"} on file
          </span>
        </div>
      </PageHero>

      <Container className="pb-16">
        {!loaded ? null : groups.length === 0 ? (
          <EmptyState onLoadDemo={loadDemo} onAddRow={addLabEntry} />
        ) : (
          <div className="space-y-8">
            {alerts.length > 0 && <AlertStrip alerts={alerts} />}

            <div className="space-y-6">
              {groups.map(([key, points]) => (
                <TrendCard
                  key={key}
                  labKey={key}
                  points={points}
                  regimen={profile.hormone_regimen_summary || profile.medications.map((m) => m.description).join("; ")}
                />
              ))}
            </div>

            <ManageLabs
              labs={profile.recent_labs}
              onAdd={addLabEntry}
              onUpdate={updateLab}
              onRemove={removeLab}
              onLoadDemo={loadDemo}
            />
          </div>
        )}
      </Container>
    </div>
  );
}

interface GroupedLabs {
  [key: string]: LabPoint[];
}

function groupLabs(labs: LabValue[]): GroupedLabs {
  const out: GroupedLabs = {};
  for (const l of labs) {
    const t = parseDate(l.date);
    const v = parseFloat(String(l.value).replace(/[^0-9.\-]/g, ""));
    if (t === null || !Number.isFinite(v)) continue;
    if (!l.name) continue;
    const key = l.name.trim().toLowerCase();
    if (!out[key]) out[key] = [];
    out[key].push({ t, value: v, date: l.date, id: l.id });
  }
  for (const k of Object.keys(out)) {
    out[k].sort((a, b) => a.t - b.t);
  }
  return out;
}

interface Alert {
  labKey: string;
  labLabel: string;
  severity: "high" | "medium";
  message: string;
  daysUntil: number | null;
}

function buildAlerts(grouped: GroupedLabs): Alert[] {
  const out: Alert[] = [];
  for (const [key, points] of Object.entries(grouped)) {
    if (points.length < 3) continue;
    const reg = regress(points);
    if (!reg) continue;
    const threshold = thresholdFor(key);
    if (!threshold) continue;
    const latest = points[points.length - 1];
    const cross = projectThreshold(reg, latest, threshold.threshold, threshold.concern);
    if (cross.already_crossed) {
      out.push({
        labKey: key,
        labLabel: threshold.label,
        severity: "high",
        message: `${threshold.label} is already ${threshold.concern} ${threshold.threshold} ${threshold.unit}.`,
        daysUntil: 0,
      });
    } else if (cross.days_until !== null && cross.days_until < 365) {
      const months = cross.days_until / 30.4;
      out.push({
        labKey: key,
        labLabel: threshold.label,
        severity: months < 6 ? "high" : "medium",
        message: `${threshold.label} is projected to cross ${threshold.threshold} ${threshold.unit} in ${describeDays(cross.days_until)}.`,
        daysUntil: cross.days_until,
      });
    }
  }
  return out.sort((a, b) => (a.daysUntil ?? 9e9) - (b.daysUntil ?? 9e9));
}

function AlertStrip({ alerts }: { alerts: Alert[] }) {
  return (
    <div className="space-y-3">
      {alerts.map((a, i) => (
        <div
          key={i}
          className={cn(
            "rounded-card p-5 flex items-start gap-3 border-l-4",
            a.severity === "high"
              ? "bg-status-banned/8 border-status-banned"
              : "bg-status-restricted/8 border-status-restricted"
          )}
        >
          <AlertTriangle
            className={cn(
              "h-5 w-5 mt-0.5 shrink-0",
              a.severity === "high" ? "text-status-banned" : "text-status-restricted"
            )}
          />
          <div className="flex-1">
            <div
              className={cn(
                "text-meta uppercase tracking-[0.12em] font-bold",
                a.severity === "high" ? "text-status-banned" : "text-status-restricted"
              )}
            >
              Trajectory alert
            </div>
            <div className="mt-1 text-body text-ink-primary leading-snug">{a.message}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendCard({
  labKey,
  points,
  regimen,
}: {
  labKey: string;
  points: LabPoint[];
  regimen: string;
}) {
  const threshold = thresholdFor(labKey);
  const band = noiseBand(points);
  const reg = points.length >= 2 ? regress(points) : null;
  const latest = points[points.length - 1];
  const [percentile, setPercentile] = useState<PercentilePayload | null>(null);

  // Cohort percentile lookup against the latest value.
  useEffect(() => {
    if (!latest) return;
    fetch("/api/cohort/percentile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lab_name: labKey, value: latest.value, regimen }),
    })
      .then((r) => r.json())
      .then((d) => setPercentile(d?.result || null))
      .catch(() => setPercentile(null));
  }, [latest, labKey, regimen]);

  const trend = reg ? slopePerMonth(reg) : 0;
  const trendTone =
    !reg || Math.abs(trend) < 1e-6
      ? "flat"
      : threshold && threshold.concern === "above"
      ? trend > 0
        ? "concerning"
        : "improving"
      : threshold && threshold.concern === "below"
      ? trend < 0
        ? "concerning"
        : "improving"
      : "neutral";
  const TrendIcon =
    trendTone === "concerning" && reg && trend > 0
      ? TrendingUp
      : trendTone === "concerning" && reg && trend < 0
      ? TrendingDown
      : reg && trend > 0
      ? TrendingUp
      : reg && trend < 0
      ? TrendingDown
      : Minus;

  return (
    <div className="glass rounded-card p-7">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-subsection capitalize">{labKey}</h2>
            {threshold && (
              <span className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
                · {threshold.unit}
              </span>
            )}
          </div>
          <div className="mt-1 text-meta text-ink-secondary">
            {points.length} reading{points.length === 1 ? "" : "s"} over{" "}
            {describeDays(points[points.length - 1].t - points[0].t) || "a single point"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {reg && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-meta font-bold px-2.5 py-1 rounded-chip",
                trendTone === "concerning"
                  ? "bg-status-restricted/15 text-status-restricted"
                  : trendTone === "improving"
                  ? "bg-status-protected/15 text-status-protected"
                  : "bg-surface-inset text-ink-secondary"
              )}
            >
              <TrendIcon className="h-3.5 w-3.5" />
              <span className="tabular-nums">
                {trend > 0 ? "+" : ""}
                {trend.toFixed(2)}/mo
              </span>
            </span>
          )}
          {percentile && (
            <span className="inline-flex items-center gap-1.5 text-meta px-2.5 py-1 rounded-chip bg-accent/10 text-accent font-bold">
              <span className="tabular-nums">{percentile.percentile}th</span>
              <span className="text-accent/80 font-normal">percentile · n={percentile.n}</span>
            </span>
          )}
        </div>
      </div>

      <TrendChart points={points} reg={reg} band={band} threshold={threshold} />

      <div className="mt-5 grid sm:grid-cols-3 gap-3">
        <Stat label="Latest" value={`${latest.value.toFixed(latest.value < 10 ? 2 : 1)} ${threshold?.unit || ""}`} hint={latest.date} />
        {band && (
          <Stat
            label="Personal range (μ±2σ)"
            value={`${band.lo.toFixed(1)} – ${band.hi.toFixed(1)}`}
            hint={`mean ${band.mean.toFixed(1)}`}
          />
        )}
        {reg && (
          <Stat
            label="Fit quality (R²)"
            value={reg.r2.toFixed(2)}
            hint={reg.r2 > 0.7 ? "strong linear trend" : reg.r2 > 0.4 ? "moderate" : "noisy"}
          />
        )}
      </div>

      {threshold && reg && (
        <ProjectionCallout
          reg={reg}
          latest={latest}
          threshold={threshold.threshold}
          direction={threshold.concern}
          unit={threshold.unit}
          note={threshold.note}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-btn border border-divider bg-surface px-4 py-3">
      <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">{label}</div>
      <div className="mt-1 text-card text-ink-primary tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-meta text-ink-secondary">{hint}</div>}
    </div>
  );
}

function ProjectionCallout({
  reg,
  latest,
  threshold,
  direction,
  unit,
  note,
}: {
  reg: NonNullable<ReturnType<typeof regress>>;
  latest: LabPoint;
  threshold: number;
  direction: "above" | "below";
  unit: string;
  note: string;
}) {
  const cross = projectThreshold(reg, latest, threshold, direction);
  if (cross.already_crossed) {
    return (
      <div className="mt-4 rounded-btn border border-status-banned/40 bg-status-banned/8 px-4 py-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-status-banned" />
          <div className="text-meta text-ink-primary leading-relaxed">
            <span className="font-bold text-status-banned">Already crossed.</span>{" "}
            Latest reading is {direction} {threshold} {unit}. {note}
          </div>
        </div>
      </div>
    );
  }
  if (cross.days_until === null) {
    return (
      <div className="mt-4 rounded-btn border border-status-protected/30 bg-status-protected/8 px-4 py-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-status-protected" />
          <div className="text-meta text-ink-primary leading-relaxed">
            <span className="font-bold text-status-protected">Trending safely.</span>{" "}
            Slope is moving away from the {threshold} {unit} threshold.
          </div>
        </div>
      </div>
    );
  }
  const months = cross.days_until / 30.4;
  const isUrgent = months < 6;
  return (
    <div
      className={cn(
        "mt-4 rounded-btn border px-4 py-3",
        isUrgent
          ? "border-status-restricted/40 bg-status-restricted/8"
          : "border-divider bg-surface-inset/40"
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className={cn(
            "h-5 w-5 mt-0.5 shrink-0",
            isUrgent ? "text-status-restricted" : "text-ink-secondary"
          )}
        />
        <div className="text-meta text-ink-primary leading-relaxed">
          At the current rate, this crosses{" "}
          <span className="font-bold tabular-nums">{threshold} {unit}</span> in roughly{" "}
          <span className="font-bold">{describeDays(cross.days_until)}</span>. {note}
        </div>
      </div>
    </div>
  );
}

function TrendChart({
  points,
  reg,
  band,
  threshold,
}: {
  points: LabPoint[];
  reg: ReturnType<typeof regress>;
  band: ReturnType<typeof noiseBand>;
  threshold: ReturnType<typeof thresholdFor>;
}) {
  const w = 720;
  const h = 280;
  const padL = 52;
  const padR = 18;
  const padT = 16;
  const padB = 36;

  // X domain — extend past the last point so projection is visible.
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const span = Math.max(60, tMax - tMin); // at least 60 days
  const projectionDays = Math.min(365, Math.max(90, span * 0.6));
  const xMin = tMin - 7;
  const xMax = tMax + projectionDays;

  // Y domain.
  const allValues = [
    ...points.map((p) => p.value),
    ...(band ? [band.lo, band.hi] : []),
  ];
  if (threshold) allValues.push(threshold.threshold);
  if (reg) {
    // Where the regression goes at xMax.
    allValues.push(reg.slope * xMax + reg.intercept);
  }
  const yRaw = Math.max(...allValues);
  const yLo = Math.min(...allValues, ...points.map((p) => p.value));
  const yPad = (yRaw - yLo) * 0.15 || 1;
  const yMin = Math.max(0, yLo - yPad);
  const yMax = yRaw + yPad;

  const xScale = (t: number) => padL + ((t - xMin) / (xMax - xMin)) * (w - padL - padR);
  const yScale = (v: number) => padT + (1 - (v - yMin) / (yMax - yMin)) * (h - padT - padB);

  // Date ticks across the visible range.
  const tickCount = 5;
  const ticks: { x: number; label: string }[] = [];
  for (let i = 0; i <= tickCount; i++) {
    const t = xMin + (i / tickCount) * (xMax - xMin);
    const d = new Date(t * 86400000);
    const label = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
    ticks.push({ x: xScale(t), label });
  }

  const yTickCount = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) yTicks.push(yMin + (i / yTickCount) * (yMax - yMin));

  const now = points[points.length - 1].t;

  return (
    <div className="mt-5 w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        role="img"
        aria-label="Lab trajectory chart"
      >
        <defs>
          <linearGradient id={`bandFill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,130,246,0.16)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0.04)" />
          </linearGradient>
          <linearGradient id={`projFade`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.2" />
          </linearGradient>
        </defs>

        {/* Noise band */}
        {band && (
          <rect
            x={padL}
            y={yScale(band.hi)}
            width={w - padL - padR}
            height={Math.max(0, yScale(band.lo) - yScale(band.hi))}
            fill="url(#bandFill)"
          />
        )}

        {/* Threshold line */}
        {threshold && (
          <g>
            <line
              x1={padL}
              x2={w - padR}
              y1={yScale(threshold.threshold)}
              y2={yScale(threshold.threshold)}
              stroke={threshold.tone === "red" ? "#EF4444" : "#F59E0B"}
              strokeWidth={1.4}
              strokeDasharray="6 4"
            />
            <text
              x={w - padR - 4}
              y={yScale(threshold.threshold) - 5}
              textAnchor="end"
              fontSize="10"
              fontWeight="700"
              fill={threshold.tone === "red" ? "#EF4444" : "#F59E0B"}
              style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
            >
              Threshold {threshold.threshold} {threshold.unit}
            </text>
          </g>
        )}

        {/* Grid lines */}
        {yTicks.map((y, i) => (
          <g key={`y-${i}`}>
            <line
              x1={padL}
              x2={w - padR}
              y1={yScale(y)}
              y2={yScale(y)}
              stroke="rgba(15,42,61,0.06)"
              strokeWidth={1}
            />
            <text x={padL - 8} y={yScale(y) + 4} textAnchor="end" fontSize="10" fill="#6B7280">
              {y.toFixed(y < 10 ? 1 : 0)}
            </text>
          </g>
        ))}

        {/* X ticks */}
        {ticks.map((t, i) => (
          <g key={`x-${i}`}>
            <text x={t.x} y={h - padB + 16} textAnchor="middle" fontSize="10" fill="#6B7280">
              {t.label}
            </text>
          </g>
        ))}

        {/* "Today" rule */}
        <line
          x1={xScale(now)}
          x2={xScale(now)}
          y1={padT}
          y2={h - padB}
          stroke="rgba(15,42,61,0.35)"
          strokeWidth={1.1}
          strokeDasharray="3 3"
        />
        <text
          x={xScale(now) + 4}
          y={padT + 11}
          fontSize="10"
          fill="rgba(15,42,61,0.55)"
          fontWeight="700"
          style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          Latest
        </text>

        {/* Regression line (history) */}
        {reg && (
          <line
            x1={xScale(tMin)}
            y1={yScale(reg.slope * tMin + reg.intercept)}
            x2={xScale(now)}
            y2={yScale(reg.slope * now + reg.intercept)}
            stroke="#3B82F6"
            strokeWidth={2}
            opacity={0.65}
          />
        )}

        {/* Regression line (projection) */}
        {reg && (
          <line
            x1={xScale(now)}
            y1={yScale(reg.slope * now + reg.intercept)}
            x2={xScale(xMax)}
            y2={yScale(reg.slope * xMax + reg.intercept)}
            stroke="url(#projFade)"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}

        {/* Data line connecting points */}
        <path
          d={points
            .map(
              (p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.t).toFixed(1)} ${yScale(p.value).toFixed(1)}`
            )
            .join(" ")}
          fill="none"
          stroke="rgba(15,42,61,0.25)"
          strokeWidth={1.5}
        />

        {/* Data points */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <g key={`pt-${i}`}>
              <circle
                cx={xScale(p.t)}
                cy={yScale(p.value)}
                r={isLast ? 6 : 4.5}
                fill={isLast ? "#3B82F6" : "#fff"}
                stroke="#3B82F6"
                strokeWidth={2}
              />
              {isLast && (
                <circle
                  cx={xScale(p.t)}
                  cy={yScale(p.value)}
                  r={11}
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth={1.2}
                  opacity={0.35}
                />
              )}
            </g>
          );
        })}

        {/* Projected crossing dot */}
        {reg && threshold && (() => {
          const cross = projectThreshold(reg, points[points.length - 1], threshold.threshold, threshold.concern);
          if (cross.already_crossed || cross.days_until === null) return null;
          const crossT = now + cross.days_until;
          if (crossT > xMax) return null;
          return (
            <g>
              <circle
                cx={xScale(crossT)}
                cy={yScale(threshold.threshold)}
                r={6}
                fill={threshold.tone === "red" ? "#EF4444" : "#F59E0B"}
                stroke="#fff"
                strokeWidth={2}
              />
              <text
                x={xScale(crossT)}
                y={yScale(threshold.threshold) + 22}
                textAnchor="middle"
                fontSize="10"
                fill={threshold.tone === "red" ? "#EF4444" : "#F59E0B"}
                fontWeight="700"
              >
                {describeDays(cross.days_until)}
              </text>
            </g>
          );
        })()}
      </svg>

      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[10px] uppercase tracking-[0.12em] text-ink-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-4 rounded-sm bg-[rgba(59,130,246,0.16)]" /> Personal range
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#3B82F6]" /> Trend
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 border-t-2 border-dashed border-[#3B82F6]" /> Projection
        </span>
        {threshold && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-0.5 w-4 border-t-2 border-dashed"
              style={{ borderColor: threshold.tone === "red" ? "#EF4444" : "#F59E0B" }}
            />{" "}
            Threshold
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyState({
  onLoadDemo,
  onAddRow,
}: {
  onLoadDemo: () => void;
  onAddRow: () => void;
}) {
  return (
    <div className="glass rounded-card p-10 text-center max-w-xl mx-auto">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
        <LineChart className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-subsection">No labs to plot yet.</h2>
      <p className="mt-2 text-meta text-ink-secondary leading-relaxed">
        Trajectory Alerts needs at least three readings of the same lab to
        draw a trend. Add them manually below, upload reports in Lab Check,
        or load the demo trajectory to see what the chart looks like.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <Button onClick={onLoadDemo}>
          <Sparkles className="h-4 w-4" /> Load demo trajectory
        </Button>
        <Button variant="secondary" onClick={onAddRow}>
          <Plus className="h-4 w-4" /> Add a lab manually
        </Button>
        <Link href="/continuity">
          <Button variant="ghost">Upload report instead</Button>
        </Link>
      </div>
      <div className="mt-8 text-meta text-ink-secondary">
        We track these:
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {LAB_THRESHOLDS.map((t) => (
          <Pill key={t.name}>{t.label}</Pill>
        ))}
      </div>
    </div>
  );
}

function ManageLabs({
  labs,
  onAdd,
  onUpdate,
  onRemove,
  onLoadDemo,
}: {
  labs: LabValue[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<LabValue>) => void;
  onRemove: (id: string) => void;
  onLoadDemo: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass rounded-card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 px-7 py-5 hover:bg-surface-inset/40 transition-colors text-left"
      >
        <div>
          <div className="text-subsection">All readings ({labs.length})</div>
          <div className="mt-0.5 text-meta text-ink-secondary">
            Add, edit, or remove individual lab entries.
          </div>
        </div>
        <div className="text-meta text-ink-secondary">
          {open ? "Hide" : "Show"}
        </div>
      </button>
      {open && (
        <div className="border-t divider-soft px-7 py-6 space-y-3">
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onLoadDemo}>
              <Sparkles className="h-4 w-4" /> Demo data
            </Button>
            <Button size="sm" variant="secondary" onClick={onAdd}>
              <Plus className="h-4 w-4" /> Add row
            </Button>
          </div>
          {labs.length === 0 ? (
            <div className="rounded-card bg-surface-inset px-5 py-4 text-meta text-ink-secondary">
              No entries yet.
            </div>
          ) : (
            <div className="space-y-2">
              {labs.map((l) => (
                <div
                  key={l.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-2 rounded-btn border border-divider bg-surface px-3 py-2"
                >
                  <input
                    value={l.name}
                    onChange={(e) => onUpdate(l.id, { name: e.target.value })}
                    placeholder="Test"
                    className="bg-transparent text-body focus:outline-none"
                  />
                  <input
                    value={l.value}
                    onChange={(e) => onUpdate(l.id, { value: e.target.value })}
                    placeholder="Value"
                    className="bg-transparent text-body focus:outline-none border-l border-divider pl-2 tabular-nums"
                  />
                  <input
                    value={l.unit}
                    onChange={(e) => onUpdate(l.id, { unit: e.target.value })}
                    placeholder="Unit"
                    className="bg-transparent text-body focus:outline-none border-l border-divider pl-2"
                  />
                  <input
                    value={l.date}
                    onChange={(e) => onUpdate(l.id, { date: e.target.value })}
                    placeholder="YYYY-MM"
                    className="bg-transparent text-body text-ink-secondary focus:outline-none border-l border-divider pl-2 tabular-nums"
                  />
                  <button
                    onClick={() => onRemove(l.id)}
                    className="text-ink-secondary hover:text-status-banned p-1"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Demo seed: 8 hematocrit readings + 5 ALT + 4 estradiol that trace the
// "doctor missed the slow drift" story. Hematocrit climbs steadily toward 52.
const SEED_LABS: Omit<LabValue, "id">[] = [
  // Hematocrit climbing on T cyp.
  { name: "Hematocrit", value: "44.1", unit: "%", date: "2023-01-15" },
  { name: "Hematocrit", value: "45.0", unit: "%", date: "2023-06-10" },
  { name: "Hematocrit", value: "45.9", unit: "%", date: "2023-11-22" },
  { name: "Hematocrit", value: "47.1", unit: "%", date: "2024-04-04" },
  { name: "Hematocrit", value: "48.4", unit: "%", date: "2024-09-18" },
  { name: "Hematocrit", value: "49.6", unit: "%", date: "2025-02-26" },
  { name: "Hematocrit", value: "50.8", unit: "%", date: "2025-08-12" },
  // ALT mostly flat, mildly noisy.
  { name: "ALT", value: "22", unit: "U/L", date: "2023-06-10" },
  { name: "ALT", value: "26", unit: "U/L", date: "2024-04-04" },
  { name: "ALT", value: "21", unit: "U/L", date: "2024-09-18" },
  { name: "ALT", value: "28", unit: "U/L", date: "2025-02-26" },
  { name: "ALT", value: "24", unit: "U/L", date: "2025-08-12" },
  // Testosterone trough.
  { name: "Testosterone", value: "510", unit: "ng/dL", date: "2024-04-04" },
  { name: "Testosterone", value: "560", unit: "ng/dL", date: "2024-09-18" },
  { name: "Testosterone", value: "535", unit: "ng/dL", date: "2025-02-26" },
  { name: "Testosterone", value: "545", unit: "ng/dL", date: "2025-08-12" },
];
