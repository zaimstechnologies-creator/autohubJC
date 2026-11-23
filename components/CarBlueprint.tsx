'use client';

import React, { useState } from 'react';
import { InspectionMarker } from '@/types';
import { AlertCircle, Trash2, Undo } from 'lucide-react';

interface CarBlueprintProps {
  markers: InspectionMarker[];
  onChange?: (markers: InspectionMarker[]) => void;
  readOnly?: boolean;
}

type DefectType = 'DENT' | 'SCRATCH' | 'CHIP' | 'RUST';

const DEFECT_CONFIG: Record<DefectType, { label: string; badge: string; color: string; bg: string }> = {
  DENT: { label: 'Dent', badge: 'D', color: '#f59e0b', bg: 'bg-amber-500' },
  SCRATCH: { label: 'Scratch', badge: 'S', color: '#0ea5e9', bg: 'bg-sky-500' },
  CHIP: { label: 'Chip', badge: 'C', color: '#a78bfa', bg: 'bg-violet-500' },
  RUST: { label: 'Rust', badge: 'R', color: '#fb7185', bg: 'bg-rose-500' },
};

const VEHICLE_BOUNDS = { left: 70, right: 930, top: 60, bottom: 360 };

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export default function CarBlueprint({ markers = [], onChange, readOnly = false }: CarBlueprintProps) {
  const [selectedType, setSelectedType] = useState<DefectType>('DENT');
  const canEdit = !readOnly && Boolean(onChange);

  const handleVehicleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!canEdit || !onChange) return;
    if (!(event.target as SVGElement).closest('[data-inspection-surface]')) return;

    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return;

    const point = event.currentTarget.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const location = point.matrixTransform(matrix.inverse());
    const x = clamp(
      ((location.x - VEHICLE_BOUNDS.left) / (VEHICLE_BOUNDS.right - VEHICLE_BOUNDS.left)) * 100,
      0,
      100
    );
    const y = clamp(
      ((location.y - VEHICLE_BOUNDS.top) / (VEHICLE_BOUNDS.bottom - VEHICLE_BOUNDS.top)) * 100,
      0,
      100
    );

    const newMarker: InspectionMarker = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      type: selectedType,
      createdAt: new Date().toISOString(),
    };

    onChange([...markers, newMarker]);
  };

  const handleRemoveMarker = (id: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!canEdit || !onChange) return;
    onChange(markers.filter((marker) => marker.id !== id));
  };

  const handleUndo = () => {
    if (!canEdit || !onChange || markers.length === 0) return;
    onChange(markers.slice(0, -1));
  };

  const handleClearAll = () => {
    if (!canEdit || !onChange || markers.length === 0) return;
    if (window.confirm('Clear all defect markers on the vehicle?')) onChange([]);
  };

  const counts = {
    DENT: markers.filter((marker) => marker.type === 'DENT').length,
    SCRATCH: markers.filter((marker) => marker.type === 'SCRATCH').length,
    CHIP: markers.filter((marker) => marker.type === 'CHIP').length,
    RUST: markers.filter((marker) => marker.type === 'RUST').length,
  };

  return (
    <div className="w-full">
      {!readOnly && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/70 bg-slate-900/80 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Mark a defect
            </span>
            {(Object.keys(DEFECT_CONFIG) as DefectType[]).map((type) => {
              const config = DEFECT_CONFIG[type];
              const isSelected = selectedType === type;

              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedType(type)}
                  className={`inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 ${
                    isSelected
                      ? `${config.bg} border-white/30 text-white shadow-sm`
                      : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/20 text-[10px] font-black">
                    {config.badge}
                  </span>
                  {config.label}
                  {counts[type] > 0 && (
                    <span className="rounded-full bg-black/20 px-1.5 py-0.5 font-mono text-[10px]">
                      {counts[type]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUndo}
              disabled={markers.length === 0}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/70 px-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
              title="Undo the most recently added marker"
            >
              <Undo className="h-3.5 w-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={markers.length === 0}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-900/70 bg-rose-950/40 px-3 text-xs font-semibold text-rose-200 transition hover:bg-rose-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-700/80 bg-[radial-gradient(ellipse_at_center,_#111d2d_0%,_#080f1d_72%)] shadow-inner">
        <svg
          viewBox="0 0 1000 420"
          role="img"
          aria-label="Top-down vehicle exterior inspection diagram"
          onClick={handleVehicleClick}
          className="block h-auto min-h-[260px] w-full select-none md:min-h-[320px] xl:max-h-[460px]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="inspection-car-paint" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#2b3c52" />
              <stop offset="0.5" stopColor="#172638" />
              <stop offset="1" stopColor="#2b3c52" />
            </linearGradient>
            <linearGradient id="inspection-car-glass" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#173d57" />
              <stop offset="1" stopColor="#0d2032" />
            </linearGradient>
          </defs>

          <g fill="none" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none">
            <path d="M90 210h820" stroke="#1e293b" strokeDasharray="5 12" strokeWidth="1" />

            <g stroke="#64748b" strokeWidth="2">
              <rect x="245" y="62" width="92" height="42" rx="17" fill="#080d15" />
              <rect x="665" y="62" width="92" height="42" rx="17" fill="#080d15" />
              <rect x="245" y="316" width="92" height="42" rx="17" fill="#080d15" />
              <rect x="665" y="316" width="92" height="42" rx="17" fill="#080d15" />
            </g>
            <g stroke="#334155" strokeWidth="2">
              <circle cx="291" cy="83" r="12" />
              <circle cx="711" cy="83" r="12" />
              <circle cx="291" cy="337" r="12" />
              <circle cx="711" cy="337" r="12" />
            </g>

            <path
              d="M148 112 C112 112 88 146 80 184 L72 210 L80 236 C88 274 112 308 148 308 H852 C888 308 912 276 920 240 L928 210 L920 180 C912 144 888 112 852 112 Z"
              fill="url(#inspection-car-paint)"
              stroke="#94a3b8"
              strokeWidth="3"
            />
            <path d="M146 124 C117 126 102 153 94 185 L88 210 L94 235 C102 267 117 294 146 296" stroke="#38bdf8" strokeWidth="3" />
            <path d="M854 124 C883 126 898 153 906 185 L912 210 L906 235 C898 267 883 294 854 296" stroke="#fb7185" strokeWidth="3" />

            <path d="M160 130 H315 Q336 210 315 290 H160 Q131 290 120 266 L106 210 L120 154 Q131 130 160 130 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <path d="M175 146 H294 Q310 210 294 274 H175 Q153 274 144 254 L132 210 L144 166 Q153 146 175 146 Z" stroke="#475569" strokeWidth="1.5" />
            <path d="M185 210 H280" stroke="#64748b" strokeDasharray="5 6" />
            <text x="219" y="202" fill="#94a3b8" fontSize="16" fontFamily="ui-monospace, monospace" textAnchor="middle">HOOD</text>
            <text x="219" y="224" fill="#64748b" fontSize="11" fontFamily="ui-monospace, monospace" textAnchor="middle">ENGINE BAY</text>

            <path d="M328 132 Q346 210 328 288 H396 Q408 210 396 132 Z" fill="url(#inspection-car-glass)" stroke="#38bdf8" strokeWidth="2" />
            <path d="M402 130 H650 V290 H402 Q416 210 402 130 Z" fill="#111d2b" stroke="#64748b" strokeWidth="2" />
            <path d="M430 145 H625 V275 H430 Z" fill="url(#inspection-car-glass)" stroke="#38bdf8" strokeWidth="2" />
            <path d="M527 146 V274" stroke="#64748b" strokeWidth="2" />
            <path d="M420 210 H636" stroke="#475569" strokeDasharray="4 7" />
            <text x="527" y="202" fill="#94a3b8" fontSize="16" fontFamily="ui-monospace, monospace" textAnchor="middle">CABIN / ROOF</text>
            <text x="527" y="224" fill="#64748b" fontSize="11" fontFamily="ui-monospace, monospace" textAnchor="middle">GLASS &amp; TRIM</text>

            <path d="M656 132 H718 Q704 210 718 288 H656 Z" fill="url(#inspection-car-glass)" stroke="#38bdf8" strokeWidth="2" />
            <path d="M730 130 H842 Q872 130 882 158 L894 210 L882 262 Q872 290 842 290 H730 Q744 210 730 130 Z" fill="#1e293b" stroke="#64748b" strokeWidth="2" />
            <path d="M756 150 H832 Q851 150 860 171 L869 210 L860 249 Q851 270 832 270 H756 Z" stroke="#475569" strokeWidth="1.5" />
            <circle cx="811" cy="210" r="27" stroke="#64748b" strokeDasharray="4 5" />
            <circle cx="811" cy="210" r="12" stroke="#475569" />
            <text x="811" y="214" fill="#94a3b8" fontSize="10" fontFamily="ui-monospace, monospace" textAnchor="middle">SPARE</text>

            <path d="M395 112 V132 M650 112 V132 M395 288 V308 M650 288 V308" stroke="#94a3b8" strokeWidth="2" />
            <path d="M398 128 V290 M652 128 V290" stroke="#475569" strokeWidth="1.5" />
            <path d="M420 119 H505 M545 119 H628 M420 301 H505 M545 301 H628" stroke="#64748b" strokeWidth="2" />
            <path d="M470 116 l12 6 M600 116 l12 6 M470 304 l12 -6 M600 304 l12 -6" stroke="#94a3b8" strokeWidth="2" />

            <path d="M90 190 Q77 210 90 230" stroke="#38bdf8" strokeWidth="4" />
            <path d="M910 190 Q923 210 910 230" stroke="#fb7185" strokeWidth="4" />
            <rect x="96" y="151" width="18" height="30" rx="8" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.5" />
            <rect x="96" y="239" width="18" height="30" rx="8" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.5" />
            <rect x="886" y="151" width="18" height="30" rx="8" fill="#fb7185" stroke="#e11d48" strokeWidth="1.5" />
            <rect x="886" y="239" width="18" height="30" rx="8" fill="#fb7185" stroke="#e11d48" strokeWidth="1.5" />
            <path d="M132 118 l-16 -20 28 8 M132 302 l-16 20 28 -8 M868 118 l16 -20 -28 8 M868 302 l16 20 -28 -8" fill="#172638" stroke="#64748b" strokeWidth="2" />

            <text x="36" y="200" fill="#38bdf8" fontSize="13" fontFamily="ui-monospace, monospace" fontWeight="700" textAnchor="middle">FRONT</text>
            <text x="36" y="220" fill="#64748b" fontSize="11" fontFamily="ui-monospace, monospace" textAnchor="middle">BONNET</text>
            <text x="964" y="200" fill="#fb7185" fontSize="13" fontFamily="ui-monospace, monospace" fontWeight="700" textAnchor="middle">REAR</text>
            <text x="964" y="220" fill="#64748b" fontSize="11" fontFamily="ui-monospace, monospace" textAnchor="middle">BOOT</text>
          </g>

          <path
            data-inspection-surface
            d="M148 112 C112 112 88 146 80 184 L72 210 L80 236 C88 274 112 308 148 308 H852 C888 308 912 276 920 240 L928 210 L920 180 C912 144 888 112 852 112 Z"
            fill="transparent"
            pointerEvents="all"
            className={canEdit ? 'cursor-crosshair' : 'cursor-default'}
          />
          {[
            { x: 245, y: 62 },
            { x: 665, y: 62 },
            { x: 245, y: 316 },
            { x: 665, y: 316 },
          ].map((wheel) => (
            <rect
              key={`${wheel.x}-${wheel.y}`}
              data-inspection-surface
              x={wheel.x}
              y={wheel.y}
              width="92"
              height="42"
              rx="17"
              fill="transparent"
              pointerEvents="all"
              className={canEdit ? 'cursor-crosshair' : 'cursor-default'}
            />
          ))}

          {markers.map((marker, index) => {
            const config = DEFECT_CONFIG[marker.type] || DEFECT_CONFIG.DENT;
            const x =
              VEHICLE_BOUNDS.left +
              (clamp(marker.x, 0, 100) / 100) * (VEHICLE_BOUNDS.right - VEHICLE_BOUNDS.left);
            const y =
              VEHICLE_BOUNDS.top +
              (clamp(marker.y, 0, 100) / 100) * (VEHICLE_BOUNDS.bottom - VEHICLE_BOUNDS.top);

            return (
              <g
                key={marker.id || index}
                role={readOnly ? undefined : 'button'}
                tabIndex={readOnly ? undefined : 0}
                aria-label={readOnly ? `${config.label} marker` : `Remove ${config.label} marker`}
                onClick={(event) => handleRemoveMarker(marker.id, event)}
                onKeyDown={(event) => {
                  if (readOnly || (event.key !== 'Enter' && event.key !== ' ')) return;
                  event.preventDefault();
                  event.stopPropagation();
                  handleRemoveMarker(marker.id);
                }}
                style={{ cursor: readOnly ? 'default' : 'pointer' }}
              >
                <title>{readOnly ? config.label : `Remove ${config.label} marker`}</title>
                <circle cx={x} cy={y} r="17" fill={config.color} fillOpacity="0.95" stroke="#f8fafc" strokeWidth="2.5" />
                <circle cx={x} cy={y} r="21" fill="none" stroke={config.color} strokeOpacity="0.35" strokeWidth="5" />
                <text
                  x={x}
                  y={y + 4}
                  fill="white"
                  fontSize="13"
                  fontWeight="800"
                  fontFamily="ui-sans-serif, system-ui, sans-serif"
                  textAnchor="middle"
                  pointerEvents="none"
                >
                  {config.badge}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] text-slate-400">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {(Object.keys(DEFECT_CONFIG) as DefectType[]).map((type) => (
            <span key={type} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DEFECT_CONFIG[type].color }} />
              {DEFECT_CONFIG[type].label} ({counts[type]})
            </span>
          ))}
          {canEdit && (
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
              Click the vehicle body or a wheel to place a marker; click a marker to remove it.
            </span>
          )}
        </div>
        <span className="font-mono text-slate-500">Total defects: {markers.length}</span>
      </div>
    </div>
  );
}
