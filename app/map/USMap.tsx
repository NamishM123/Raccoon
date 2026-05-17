"use client";

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from "react-simple-maps";
import { CARE_STATUS_BY_CODE } from "@/data/care_status";
import { CARE_CENTERS, type CareCenter } from "@/data/care_centers";
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
  showCenters,
}: {
  procedure: ProcedureKey;
  onSelect: (stateCode: string) => void;
  showCenters: boolean;
}) {
  const [hover, setHover] = useState<{
    code: string;
    name: string;
    status: CareStatus;
    x: number;
    y: number;
  } | null>(null);
  const [centerHover, setCenterHover] = useState<{
    center: CareCenter;
    x: number;
    y: number;
  } | null>(null);

  return (
    <div className="relative">
      <ComposableMap projection="geoAlbersUsa" width={980} height={560}>
        <defs>
          <radialGradient id="centerPin" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#5BA8E8" />
            <stop offset="60%" stopColor="#1D70B8" />
            <stop offset="100%" stopColor="#0F4C82" />
          </radialGradient>
          <filter id="centerPinShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="0.6" />
            <feOffset dx="0" dy="0.4" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <Geographies geography={US_TOPOLOGY_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const fips = geo.id;
              const code = FIPS_TO_STATE[fips];
              const state = code ? CARE_STATUS_BY_CODE[code] : null;
              const status = state?.procedures[procedure].status;
              const fill = status ? STATUS_FILL[status] : "#E5E5EA";
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
                      x: rect.left - (parentRect?.left || 0) + rect.width / 2,
                      y: rect.top - (parentRect?.top || 0),
                    });
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => state && onSelect(state.state_code)}
                  style={{
                    default: {
                      fill,
                      stroke: "#FFFFFF",
                      strokeWidth: 0.75,
                      outline: "none",
                      cursor: state ? "pointer" : "default",
                      transition: "fill 0.18s",
                    },
                    hover: {
                      fill,
                      filter: "brightness(0.92)",
                      outline: "none",
                    },
                    pressed: {
                      fill,
                      outline: "none",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>

        {showCenters &&
          CARE_CENTERS.map((c) => {
            const isHovered = centerHover?.center.id === c.id;
            return (
              <Marker
                key={c.id}
                coordinates={c.coordinates}
                onMouseEnter={(e) => {
                  const rect = (e.target as SVGElement).getBoundingClientRect();
                  const parentRect = (e.target as SVGElement)
                    .closest("svg")
                    ?.getBoundingClientRect();
                  setCenterHover({
                    center: c,
                    x: rect.left - (parentRect?.left || 0) + rect.width / 2,
                    y: rect.top - (parentRect?.top || 0),
                  });
                }}
                onMouseLeave={() => setCenterHover(null)}
                onClick={() => onSelect(c.state_code)}
                style={{ default: { cursor: "pointer" } }}
              >
                <g
                  filter="url(#centerPinShadow)"
                  style={{ transition: "transform 0.15s ease-out" }}
                  transform={isHovered ? "scale(1.35)" : "scale(1)"}
                >
                  {/* soft halo */}
                  <circle
                    r={6}
                    fill="#1D70B8"
                    opacity={isHovered ? 0.22 : 0.14}
                  />
                  {/* main pin */}
                  <circle
                    r={3.4}
                    fill="url(#centerPin)"
                    stroke="#FFFFFF"
                    strokeWidth={1}
                  />
                  {/* inner highlight */}
                  <circle
                    r={1.1}
                    cx={-0.6}
                    cy={-0.6}
                    fill="#FFFFFF"
                    opacity={0.7}
                  />
                </g>
              </Marker>
            );
          })}
      </ComposableMap>

      {hover && !centerHover && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-btn bg-ink-primary text-white px-3 py-1.5 text-meta whitespace-nowrap shadow-card z-20"
          style={{ left: hover.x, top: hover.y - 6 }}
        >
          <span className="font-medium">{hover.name}</span>
          <span className="text-white/70"> · {statusLabel(hover.status)}</span>
        </div>
      )}

      {centerHover && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-btn bg-ink-primary text-white px-3 py-2 text-meta whitespace-nowrap shadow-card z-20"
          style={{ left: centerHover.x, top: centerHover.y - 10 }}
        >
          <div className="font-medium">{centerHover.center.name}</div>
          <div className="text-white/70">
            {centerHover.center.city}, {centerHover.center.state_code}
            {centerHover.center.serves_minors ? " · serves minors" : ""}
          </div>
        </div>
      )}
    </div>
  );
}
