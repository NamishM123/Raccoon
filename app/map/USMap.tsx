"use client";

import { useEffect, useRef, useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { CARE_STATUS_BY_CODE } from "@/data/care_status";
import {
  getCombinedStatus,
  INSURANCE_LABELS,
  type InsuranceKey,
} from "@/data/insurance_coverage";
import { FIPS_TO_STATE, US_TOPOLOGY_URL } from "@/lib/fips";
import type { CareStatus, ProcedureKey } from "@/types";
import { statusLabel } from "@/components/Pill";

const STATUS_FILL: Record<CareStatus, string> = {
  PROTECTED: "#34C759",
  LEGAL: "#A7D8A7",
  RESTRICTED: "#FF9500",
  BANNED: "#FF3B30",
  IN_LITIGATION: "#8E8E93",
};

const HOVER_DELAY_MS = 1500;

export function USMap({
  procedure,
  insurance,
  onSelect,
  matchingStates,
}: {
  procedure: ProcedureKey;
  insurance: InsuranceKey;
  onSelect: (stateCode: string) => void;
  matchingStates?: Set<string> | null;
}) {
  const [hover, setHover] = useState<{
    code: string;
    name: string;
    status: CareStatus;
    fips: string;
    x: number;
    y: number;
  } | null>(null);

  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHoverTimer() {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }

  useEffect(() => () => clearHoverTimer(), []);

  return (
    <div className="relative">
      <ComposableMap projection="geoAlbersUsa" width={980} height={560}>
        <Geographies geography={US_TOPOLOGY_URL}>
          {({ geographies }) => {
            const ordered = hover
              ? [
                  ...geographies.filter((g) => g.id !== hover.fips),
                  ...geographies.filter((g) => g.id === hover.fips),
                ]
              : geographies;
            return ordered.map((geo) => {
              const fips = geo.id;
              const code = FIPS_TO_STATE[fips];
              const state = code ? CARE_STATUS_BY_CODE[code] : null;
              const status = state
                ? getCombinedStatus(state.state_code, insurance, procedure)
                : undefined;
              const fill = status ? STATUS_FILL[status] : "#E5E5EA";
              const isMatching =
                !matchingStates || (code ? matchingStates.has(code) : false);
              const dimmed = !!matchingStates && !isMatching;
              const isHovered = hover?.fips === fips;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(e) => {
                    if (!state || !status) return;
                    const target = e.target as SVGPathElement;
                    const rect = target.getBoundingClientRect();
                    const parentRect = target
                      .closest("svg")
                      ?.getBoundingClientRect();
                    const next = {
                      code: state.state_code,
                      name: state.state_name,
                      status,
                      fips,
                      x: rect.left - (parentRect?.left || 0) + rect.width / 2,
                      y: rect.top - (parentRect?.top || 0),
                    };
                    clearHoverTimer();
                    hoverTimerRef.current = setTimeout(() => {
                      setHover(next);
                    }, HOVER_DELAY_MS);
                  }}
                  onMouseLeave={() => {
                    clearHoverTimer();
                    setHover(null);
                  }}
                  onClick={() => {
                    if (!state || !status) return;
                    clearHoverTimer();
                    onSelect(state.state_code);
                  }}
                  style={{
                    default: {
                      fill,
                      stroke: isHovered ? "#0A2540" : "#FFFFFF",
                      strokeWidth: isHovered ? 2.25 : 0.75,
                      opacity: dimmed ? 0.25 : 1,
                      outline: "none",
                      cursor: state ? "pointer" : "default",
                      transition: "fill 0.18s, stroke-width 0.12s, opacity 0.18s",
                    },
                    hover: {
                      fill,
                      stroke: "#0A2540",
                      strokeWidth: 2.25,
                      opacity: dimmed ? 0.45 : 1,
                      filter: "brightness(0.92)",
                      outline: "none",
                    },
                    pressed: {
                      fill,
                      stroke: "#0A2540",
                      strokeWidth: 2.25,
                      opacity: dimmed ? 0.45 : 1,
                      outline: "none",
                    },
                  }}
                />
              );
            });
          }}
        </Geographies>
      </ComposableMap>

      {hover && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-btn bg-ink-primary text-white px-3 py-1.5 text-meta whitespace-nowrap shadow-card"
          style={{ left: hover.x, top: hover.y - 6 }}
        >
          <span className="font-medium">{hover.name}</span>
          <span className="text-white/70">
            {" "}· {INSURANCE_LABELS[insurance]} · {statusLabel(hover.status)}
          </span>
        </div>
      )}
    </div>
  );
}
