"use client";

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { CARE_STATUS_BY_CODE } from "@/data/care_status";
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

export function USMap({
  procedure,
  onSelect,
}: {
  procedure: ProcedureKey;
  onSelect: (stateCode: string) => void;
}) {
  const [hover, setHover] = useState<{
    code: string;
    name: string;
    status: CareStatus;
    fips: string;
    x: number;
    y: number;
  } | null>(null);

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
              const status = state?.procedures[procedure].status;
              const fill = status ? STATUS_FILL[status] : "#E5E5EA";
              const isHovered = hover?.fips === fips;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onMouseEnter={(e) => {
                    if (!state || !status) return;
                    const rect = (e.target as SVGPathElement).getBoundingClientRect();
                    const parentRect = (e.target as SVGPathElement)
                      .closest("svg")
                      ?.getBoundingClientRect();
                    setHover({
                      code: state.state_code,
                      name: state.state_name,
                      status,
                      fips,
                      x: rect.left - (parentRect?.left || 0) + rect.width / 2,
                      y: rect.top - (parentRect?.top || 0),
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => state && onSelect(state.state_code)}
                  style={{
                    default: {
                      fill,
                      stroke: isHovered ? "#0A2540" : "#FFFFFF",
                      strokeWidth: isHovered ? 2.25 : 0.75,
                      outline: "none",
                      cursor: state ? "pointer" : "default",
                      transition: "fill 0.18s, stroke-width 0.12s",
                    },
                    hover: {
                      fill,
                      stroke: "#0A2540",
                      strokeWidth: 2.25,
                      filter: "brightness(0.92)",
                      outline: "none",
                    },
                    pressed: {
                      fill,
                      stroke: "#0A2540",
                      strokeWidth: 2.25,
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
          <span className="text-white/70"> · {statusLabel(hover.status)}</span>
        </div>
      )}
    </div>
  );
}
