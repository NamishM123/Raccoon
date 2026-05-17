"use client";

import { useMemo, useState } from "react";
import { Activity, CalendarCheck, FlaskConical, TrendingUp, TrendingDown } from "lucide-react";
import { Container } from "@/components/Container";
import { PageHero } from "@/components/PageHero";
import { Pill } from "@/components/Pill";
import { cn } from "@/lib/cn";
import { DRUGS, simulate, type DrugSpec, type SimulationResult } from "@/lib/pk";

export function PredictClient() {
  const [drugId, setDrugId] = useState<string>(DRUGS[0].id);
  const drug = useMemo(() => DRUGS.find((d) => d.id === drugId) || DRUGS[0], [drugId]);
  const [doseMg, setDoseMg] = useState<number>(drug.default_dose_mg);
  const [intervalDays, setIntervalDays] = useState<number>(drug.default_interval_days);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareDose, setCompareDose] = useState<number>(drug.default_dose_mg * 2);
  const [compareInterval, setCompareInterval] = useState<number>(drug.default_interval_days * 2);

  // When the user switches drug, snap dose/interval to that drug's defaults.
  function pickDrug(id: string) {
    const next = DRUGS.find((d) => d.id === id);
    if (!next) return;
    setDrugId(id);
    setDoseMg(next.default_dose_mg);
    setIntervalDays(next.default_interval_days);
    setCompareDose(next.default_dose_mg * 2);
    setCompareInterval(next.default_interval_days * 2);
  }

  const primary = useMemo(
    () => simulate(drug, doseMg, intervalDays, 35, 280),
    [drug, doseMg, intervalDays]
  );
  const compare = useMemo(
    () =>
      compareEnabled
        ? simulate(drug, compareDose, compareInterval, 35, 280)
        : null,
    [drug, compareDose, compareInterval, compareEnabled]
  );

  return (
    <div className="page-ocean">
      <PageHero
        eyebrow="Hormone level prediction"
        title="Where will your hormones be next Tuesday?"
        description="Plug in your injection schedule. We model the pharmacokinetics — absorption + elimination — and project your serum level across the next month. Find your trough. Spot your peak. Pick the best day to draw labs."
      >
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-meta text-sea-ink/75">
          <span className="inline-flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="text-ink-primary font-bold">Bateman-equation</span> model
          </span>
          <span className="inline-flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Calibrated to published PK studies
          </span>
        </div>
      </PageHero>

      <Container className="pb-16">
        <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
          {/* Controls */}
          <div className="flex flex-col gap-6">
            <div className="glass rounded-card p-7">
              <h2 className="text-subsection">Regimen</h2>
              <p className="mt-1 text-meta text-ink-secondary">
                Pick a formulation. Doses are starting defaults — adjust to match yours.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {DRUGS.map((d) => (
                  <Pill key={d.id} selected={drugId === d.id} onClick={() => pickDrug(d.id)}>
                    {d.short}
                  </Pill>
                ))}
              </div>
              <p className="mt-3 text-meta text-ink-secondary leading-relaxed">
                <span className="text-ink-primary font-bold">{drug.label}.</span>{" "}
                {drug.note}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <NumberField
                  label="Dose"
                  value={doseMg}
                  step={drug.default_dose_mg < 1 ? 0.025 : 0.5}
                  suffix="mg"
                  onChange={setDoseMg}
                />
                <NumberField
                  label="Every"
                  value={intervalDays}
                  step={0.5}
                  suffix="days"
                  onChange={setIntervalDays}
                />
              </div>
            </div>

            <div className="glass rounded-card p-7">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-subsection">Compare a second regimen</h2>
                <label className="inline-flex items-center gap-2 cursor-pointer text-meta">
                  <input
                    type="checkbox"
                    checked={compareEnabled}
                    onChange={(e) => setCompareEnabled(e.target.checked)}
                    className="h-4 w-4 rounded border-divider"
                  />
                  {compareEnabled ? "On" : "Off"}
                </label>
              </div>
              <p className="mt-1 text-meta text-ink-secondary">
                E.g. weekly vs biweekly. The orange line overlays the chart.
              </p>
              {compareEnabled && (
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <NumberField
                    label="Dose"
                    value={compareDose}
                    step={drug.default_dose_mg < 1 ? 0.025 : 0.5}
                    suffix="mg"
                    onChange={setCompareDose}
                  />
                  <NumberField
                    label="Every"
                    value={compareInterval}
                    step={0.5}
                    suffix="days"
                    onChange={setCompareInterval}
                  />
                </div>
              )}
            </div>

            <Readouts result={primary} compare={compare} />
          </div>

          {/* Chart */}
          <div className="glass rounded-card p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-subsection">Projected serum {drug.hormone}</h2>
                <p className="mt-1 text-meta text-ink-secondary">
                  Steady-state assumed from prior doses. Day 0 = today.
                </p>
              </div>
              <Legend hasCompare={compareEnabled} units={drug.units} />
            </div>
            <SerumChart primary={primary} compare={compare} drug={drug} />
            <p className="mt-4 text-meta text-ink-secondary leading-relaxed">
              Model: one-compartment first-order absorption (Bateman). Constants
              calibrated to published single-dose peak/time means. <strong className="text-ink-primary font-bold">Inter-patient
              variability is large</strong> — this is a tool for understanding
              your schedule's shape, not a clinical prescription.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  suffix: string;
}) {
  return (
    <div>
      <label className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
        {label}
      </label>
      <div className="mt-2 flex items-center gap-2 rounded-btn border border-divider bg-surface px-3 py-2">
        <input
          type="number"
          value={value}
          step={step}
          min={0}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (Number.isFinite(v) && v >= 0) onChange(v);
          }}
          className="flex-1 bg-transparent text-body focus:outline-none tabular-nums"
        />
        <span className="text-meta text-ink-secondary">{suffix}</span>
      </div>
    </div>
  );
}

function Readouts({
  result,
  compare,
}: {
  result: SimulationResult;
  compare: SimulationResult | null;
}) {
  const drug = result.drug;
  const fmt = (v: number) => `${Math.round(v).toLocaleString()} ${drug.units}`;
  const dfmt = (d: number) => `Day ${d.toFixed(1)}`;
  const inRange = (v: number) => v >= drug.target_min && v <= drug.target_max;

  return (
    <div className="glass rounded-card p-7 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarCheck className="h-5 w-5 text-accent" />
        <h2 className="text-subsection">Readouts</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ReadoutTile
          icon={<TrendingUp className="h-4 w-4 text-status-restricted" />}
          label="Peak"
          value={fmt(result.peak_value)}
          hint={dfmt(result.peak_day)}
        />
        <ReadoutTile
          icon={<TrendingDown className="h-4 w-4 text-accent" />}
          label="Trough"
          value={fmt(result.trough_value)}
          hint={dfmt(result.trough_day)}
        />
      </div>

      <div className="rounded-btn border border-divider bg-surface-inset/40 px-4 py-3">
        <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
          Best day to draw labs
        </div>
        <div className="mt-1 text-card text-ink-primary tabular-nums">
          Day {result.best_lab_day.toFixed(1)}
        </div>
        <div className="mt-0.5 text-meta text-ink-secondary">
          Draw a "trough" right before your next injection — that's the lowest
          point of the cycle and the comparator most clinical targets use.
        </div>
      </div>

      <div className="rounded-btn border border-divider bg-surface-inset/40 px-4 py-3">
        <div className="text-meta uppercase tracking-[0.12em] text-ink-secondary">
          Target window
        </div>
        <div className="mt-1 text-meta text-ink-primary">
          {drug.target_min}–{drug.target_max} {drug.units}
        </div>
        <div className="mt-1 text-meta text-ink-secondary">
          Your trough is{" "}
          <span
            className={cn(
              "font-bold",
              inRange(result.trough_value)
                ? "text-status-protected"
                : "text-status-restricted"
            )}
          >
            {inRange(result.trough_value) ? "in range" : "outside the typical window"}
          </span>
          .
        </div>
      </div>

      {compare && (
        <div className="rounded-btn border border-accent/40 bg-accent/5 px-4 py-3">
          <div className="text-meta uppercase tracking-[0.12em] text-accent font-bold">
            Compare regimen
          </div>
          <div className="mt-1 text-meta text-ink-primary">
            Peak {fmt(compare.peak_value)} · Trough {fmt(compare.trough_value)}
          </div>
          <div className="mt-0.5 text-meta text-ink-secondary">
            Peak–trough swing:{" "}
            <span className="font-bold text-ink-primary">
              {Math.round(compare.peak_value - compare.trough_value).toLocaleString()} {drug.units}
            </span>
            {" "}vs primary{" "}
            <span className="font-bold text-ink-primary">
              {Math.round(result.peak_value - result.trough_value).toLocaleString()} {drug.units}
            </span>
            .
          </div>
        </div>
      )}
    </div>
  );
}

function ReadoutTile({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-btn border border-divider bg-surface px-4 py-3">
      <div className="flex items-center gap-2 text-meta uppercase tracking-[0.12em] text-ink-secondary">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-card text-ink-primary tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-meta text-ink-secondary">{hint}</div>}
    </div>
  );
}

function Legend({ hasCompare, units }: { hasCompare: boolean; units: string }) {
  return (
    <div className="flex flex-col items-end gap-1 text-meta text-ink-secondary">
      <div className="inline-flex items-center gap-2">
        <span className="inline-block h-0.5 w-6 bg-accent rounded-full" />
        Your regimen
      </div>
      {hasCompare && (
        <div className="inline-flex items-center gap-2">
          <span
            className="inline-block h-0.5 w-6 rounded-full"
            style={{ background: "#F59E0B" }}
          />
          Compare
        </div>
      )}
      <div className="inline-flex items-center gap-2">
        <span className="inline-block h-2 w-6 rounded-sm bg-status-protected/30" />
        Target band
      </div>
      <div className="text-[10px] uppercase tracking-[0.12em]">y: {units}</div>
    </div>
  );
}

function SerumChart({
  primary,
  compare,
  drug,
}: {
  primary: SimulationResult;
  compare: SimulationResult | null;
  drug: DrugSpec;
}) {
  const w = 720;
  const h = 320;
  const padL = 50;
  const padR = 16;
  const padT = 14;
  const padB = 36;

  const series = primary.series;
  const xs = series.map((p) => p.day);
  const allLevels = [
    ...series.map((p) => p.level),
    ...(compare?.series.map((p) => p.level) || []),
    drug.target_max * 1.15,
  ];
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = 0;
  const yMax = Math.max(...allLevels, drug.target_max * 1.2);

  const xScale = (x: number) => padL + ((x - xMin) / (xMax - xMin)) * (w - padL - padR);
  const yScale = (y: number) => padT + (1 - (y - yMin) / (yMax - yMin)) * (h - padT - padB);

  const toPath = (points: { day: number; level: number }[]) =>
    points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(p.day).toFixed(1)} ${yScale(p.level).toFixed(1)}`)
      .join(" ");

  const dayTicks: number[] = [];
  for (let d = Math.ceil(xMin / 7) * 7; d <= xMax; d += 7) dayTicks.push(d);

  const yTickCount = 4;
  const yTicks: number[] = [];
  for (let i = 0; i <= yTickCount; i++) yTicks.push((yMax / yTickCount) * i);

  // Target band rectangle.
  const bandY = yScale(drug.target_max);
  const bandH = yScale(drug.target_min) - bandY;

  return (
    <div className="mt-4 w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        role="img"
        aria-label={`Predicted serum ${drug.hormone} over time`}
      >
        <defs>
          <linearGradient id="primaryFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(59,130,246,0.20)" />
            <stop offset="100%" stopColor="rgba(59,130,246,0)" />
          </linearGradient>
        </defs>

        {/* Target band */}
        <rect
          x={padL}
          y={bandY}
          width={w - padL - padR}
          height={Math.max(0, bandH)}
          fill="rgba(34,197,94,0.12)"
        />
        <text
          x={w - padR - 6}
          y={bandY + 12}
          textAnchor="end"
          fontSize="10"
          fill="#16a34a"
          fontWeight="700"
          style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          Target {drug.target_min}–{drug.target_max} {drug.units}
        </text>

        {/* Grid */}
        {yTicks.map((y, i) => (
          <g key={`yt-${i}`}>
            <line
              x1={padL}
              x2={w - padR}
              y1={yScale(y)}
              y2={yScale(y)}
              stroke="rgba(15,42,61,0.08)"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={yScale(y) + 4}
              textAnchor="end"
              fontSize="10"
              fill="#6B7280"
            >
              {Math.round(y)}
            </text>
          </g>
        ))}
        {dayTicks.map((d) => (
          <g key={`xt-${d}`}>
            <line
              x1={xScale(d)}
              x2={xScale(d)}
              y1={padT}
              y2={h - padB}
              stroke="rgba(15,42,61,0.05)"
              strokeWidth={1}
            />
            <text
              x={xScale(d)}
              y={h - padB + 14}
              textAnchor="middle"
              fontSize="10"
              fill="#6B7280"
            >
              {d === 0 ? "Today" : `${d > 0 ? "+" : ""}${d}d`}
            </text>
          </g>
        ))}

        {/* "Today" rule */}
        <line
          x1={xScale(0)}
          x2={xScale(0)}
          y1={padT}
          y2={h - padB}
          stroke="rgba(15,42,61,0.35)"
          strokeWidth={1.2}
          strokeDasharray="3 3"
        />

        {/* Dose markers (forward only) */}
        {primary.doses
          .filter((d) => d.day >= xMin && d.day <= xMax)
          .map((d, i) => (
            <g key={`dose-${i}`}>
              <line
                x1={xScale(d.day)}
                x2={xScale(d.day)}
                y1={h - padB}
                y2={h - padB - 6}
                stroke="rgba(59,130,246,0.55)"
                strokeWidth={2}
              />
            </g>
          ))}

        {/* Primary fill + line */}
        <path
          d={`${toPath(series)} L ${xScale(xMax)} ${yScale(0)} L ${xScale(xMin)} ${yScale(0)} Z`}
          fill="url(#primaryFill)"
        />
        <path d={toPath(series)} fill="none" stroke="#3B82F6" strokeWidth={2.2} />

        {/* Compare line */}
        {compare && (
          <path
            d={toPath(compare.series)}
            fill="none"
            stroke="#F59E0B"
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        )}

        {/* Best lab day callout */}
        <g>
          <line
            x1={xScale(primary.best_lab_day)}
            x2={xScale(primary.best_lab_day)}
            y1={padT}
            y2={h - padB}
            stroke="#16a34a"
            strokeWidth={1.4}
            strokeDasharray="2 4"
          />
          <text
            x={xScale(primary.best_lab_day) + 6}
            y={padT + 12}
            fontSize="10"
            fill="#16a34a"
            fontWeight="700"
            style={{ letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            Best lab draw
          </text>
        </g>

        {/* Peak dot */}
        <circle
          cx={xScale(primary.peak_day)}
          cy={yScale(primary.peak_value)}
          r={4}
          fill="#EF4444"
          stroke="#fff"
          strokeWidth={1.5}
        />
        {/* Trough dot */}
        <circle
          cx={xScale(primary.trough_day)}
          cy={yScale(primary.trough_value)}
          r={4}
          fill="#3B82F6"
          stroke="#fff"
          strokeWidth={1.5}
        />
      </svg>
    </div>
  );
}
