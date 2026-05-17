"use client";

import { useState } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { Plus, Minus, RotateCcw, MapPin } from "lucide-react";
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

const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 1.6;

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
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<[number, number]>([0, 0]);

  function zoomIn() {
    setZoom((z) => Math.min(z * ZOOM_STEP, MAX_ZOOM));
  }
  function zoomOut() {
    setZoom((z) => Math.max(z / ZOOM_STEP, MIN_ZOOM));
  }
  function reset() {
    setZoom(1);
    setPosition([0, 0]);
  }

  // Scale marker size inversely so they stay readable when zoomed in.
  const markerR = Math.max(2.6, 5 / Math.sqrt(zoom));

  return (
    <div className="relative">
      <ComposableMap projection="geoAlbersUsa" width={980} height={560}>
        <ZoomableGroup
          zoom={zoom}
          center={position}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          onMoveEnd={(p) => {
            setPosition(p.coordinates);
            setZoom(p.zoom);
          }}
        >
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
            CARE_CENTERS.map((c) => (
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
                <circle
                  r={markerR}
                  fill="#1D70B8"
                  stroke="#FFFFFF"
                  strokeWidth={Math.max(0.6, 1.2 / Math.sqrt(zoom))}
                  style={{ pointerEvents: "all" }}
                />
              </Marker>
            ))}
        </ZoomableGroup>
      </ComposableMap>

      {/* Zoom controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
        <ZoomButton onClick={zoomIn} disabled={zoom >= MAX_ZOOM} label="Zoom in">
          <Plus className="h-4 w-4" />
        </ZoomButton>
        <ZoomButton onClick={zoomOut} disabled={zoom <= MIN_ZOOM} label="Zoom out">
          <Minus className="h-4 w-4" />
        </ZoomButton>
        <ZoomButton
          onClick={reset}
          disabled={zoom === 1 && position[0] === 0 && position[1] === 0}
          label="Reset view"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </ZoomButton>
      </div>

      {showCenters && (
        <div className="absolute bottom-3 left-3 z-10 inline-flex items-center gap-2 rounded-chip bg-ink-primary/90 text-white px-3 py-1.5 text-meta">
          <MapPin className="h-3.5 w-3.5" />
          <span>{CARE_CENTERS.length} care centers (sample)</span>
        </div>
      )}

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
          style={{ left: centerHover.x, top: centerHover.y - 6 }}
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

function ZoomButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="h-9 w-9 rounded-btn glass-strong shadow-card flex items-center justify-center text-ink-primary hover:bg-surface-inset disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );
}
