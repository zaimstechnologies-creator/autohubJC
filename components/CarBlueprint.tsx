'use client';

import React, { useState, useRef } from 'react';
import { InspectionMarker } from '@/types';
import { Undo, Trash2, AlertCircle } from 'lucide-react';

interface CarBlueprintProps {
  markers: InspectionMarker[];
  onChange?: (markers: InspectionMarker[]) => void;
  readOnly?: boolean;
}

type DefectType = 'DENT' | 'SCRATCH' | 'CHIP' | 'RUST';

const DEFECT_CONFIG: Record<DefectType, { label: string; badge: string; color: string; border: string; bg: string; text: string }> = {
  DENT: {
    label: 'Dent [D]',
    badge: 'D',
    color: '#f59e0b',
    border: 'border-amber-500',
    bg: 'bg-amber-500',
    text: 'text-amber-500',
  },
  SCRATCH: {
    label: 'Scratch [S]',
    badge: 'S',
    color: '#0284c7',
    border: 'border-sky-500',
    bg: 'bg-sky-500',
    text: 'text-sky-500',
  },
  CHIP: {
    label: 'Chip [C]',
    badge: 'C',
    color: '#8b5cf6',
    border: 'border-purple-500',
    bg: 'bg-purple-500',
    text: 'text-purple-500',
  },
  RUST: {
    label: 'Rust [R]',
    badge: 'R',
    color: '#e11d48',
    border: 'border-rose-500',
    bg: 'bg-rose-500',
    text: 'text-rose-500',
  },
};

export default function CarBlueprint({ markers = [], onChange, readOnly = false }: CarBlueprintProps) {
  const [selectedType, setSelectedType] = useState<DefectType>('DENT');
  const [hoveredMarker, setHoveredMarker] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !onChange || !containerRef.current) return;

    // Avoid adding marker if clicked directly on an existing marker
    if ((e.target as HTMLElement).closest('.defect-marker-badge')) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10;
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10;

    const newMarker: InspectionMarker = {
      id: `m_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x,
      y,
      type: selectedType,
      createdAt: new Date().toISOString(),
    };

    onChange([...markers, newMarker]);
  };

  const handleRemoveMarker = (id: string, e?: React.MouseEvent) => {
    if (readOnly || !onChange) return;
    if (e) e.stopPropagation();
    onChange(markers.filter((m) => m.id !== id));
  };

  const handleUndo = (e: React.MouseEvent) => {
    e.preventDefault();
    if (readOnly || !onChange || markers.length === 0) return;
    onChange(markers.slice(0, -1));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    if (readOnly || !onChange || markers.length === 0) return;
    if (window.confirm('Clear all defect markers on the car blueprint?')) {
      onChange([]);
    }
  };

  const counts = {
    DENT: markers.filter((m) => m.type === 'DENT').length,
    SCRATCH: markers.filter((m) => m.type === 'SCRATCH').length,
    CHIP: markers.filter((m) => m.type === 'CHIP').length,
    RUST: markers.filter((m) => m.type === 'RUST').length,
  };

  return (
    <div className="w-full select-none">
      {/* Controls Bar (Hidden in ReadOnly / Print mode) */}
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 p-2.5 bg-slate-900/80 rounded-xl border border-slate-700/60 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider mr-1">
              Select Defect:
            </span>
            {(['DENT', 'SCRATCH', 'CHIP', 'RUST'] as DefectType[]).map((type) => {
              const cfg = DEFECT_CONFIG[type];
              const isActive = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                    isActive
                      ? `${cfg.bg} text-white ring-2 ring-white/50 scale-105 shadow-md`
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-600/50'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                    {cfg.badge}
                  </span>
                  <span>{type}</span>
                  {counts[type] > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-white font-mono">
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
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-600/60 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              title="Undo last placed marker"
            >
              <Undo className="w-3.5 h-3.5" />
              Undo
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={markers.length === 0}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-rose-950/60 text-rose-300 hover:text-white hover:bg-rose-900 border border-rose-800/60 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
              title="Clear all defect markers"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Blueprint Visual Canvas */}
      <div
        ref={containerRef}
        onClick={handleContainerClick}
        className={`relative w-full rounded-xl overflow-hidden border border-slate-700/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 shadow-inner flex items-center justify-center p-3 ${
          readOnly ? 'cursor-default' : 'cursor-crosshair group'
        }`}
        style={{ minHeight: '220px' }}
      >
        {/* Subtle grid pattern for precision blueprint look */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* Blueprint Top-Down Car SVG */}
        <svg
          viewBox="0 0 520 185"
          className="w-full max-w-2xl h-auto drop-shadow-md select-none pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g stroke="#64748b" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
            {/* Front Bumper & Nose */}
            <path d="M 65,26 C 45,26 36,36 36,50 L 36,98 C 36,112 45,122 65,122" fill="#0f172a" stroke="#38bdf8" />
            <path d="M 38,36 C 30,42 30,106 38,112" strokeWidth="1.8" stroke="#38bdf8" />

            {/* Front Headlights */}
            <circle cx="48" cy="40" r="4.5" fill="#38bdf8" fillOpacity="0.4" stroke="#38bdf8" />
            <circle cx="58" cy="40" r="3.5" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" />
            <circle cx="48" cy="108" r="4.5" fill="#38bdf8" fillOpacity="0.4" stroke="#38bdf8" />
            <circle cx="58" cy="108" r="3.5" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" />

            {/* Bonnet / Hood Lines */}
            <path d="M 65,48 L 130,45" stroke="#475569" strokeDasharray="2,2" />
            <path d="M 65,100 L 130,103" stroke="#475569" strokeDasharray="2,2" />
            <text x="95" y="77" fontSize="8" fontFamily="monospace" fill="#64748b" textAnchor="middle" fontWeight="bold">ENGINE HOOD</text>

            {/* Main Outer Body Shell */}
            <path
              d="M 65,26 L 95,26 C 95,20 100,15 110,15 C 120,15 125,20 125,26 L 295,26 C 295,20 300,15 310,15 C 320,15 325,20 325,26 L 360,26 C 375,26 384,35 384,52 L 384,96 C 384,113 375,122 360,122 L 325,122 C 325,128 320,133 310,133 C 300,133 295,128 295,122 L 125,122 C 125,128 120,133 110,133 C 100,133 95,128 95,122 L 65,122 Z"
              fill="#1e293b"
              stroke="#94a3b8"
              strokeWidth="1.8"
            />

            {/* Front Windshield */}
            <path d="M 132,30 C 138,42 138,106 132,118 L 150,115 C 154,103 154,45 150,33 Z" fill="#0284c7" fillOpacity="0.25" stroke="#0284c7" />

            {/* Roof / Panoramic glass */}
            <rect x="158" y="34" width="78" height="80" rx="5" fill="#0f172a" stroke="#64748b" strokeDasharray="3,2" />
            <text x="197" y="77" fontSize="7" fontFamily="monospace" fill="#94a3b8" textAnchor="middle">CABIN / ROOF</text>

            {/* Windows / Doors Outlines (Top side) */}
            <path d="M 155,30 L 195,30 L 195,40 L 155,40 Z" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" />
            <path d="M 199,30 L 245,30 L 245,40 L 199,40 Z" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" />

            {/* Windows / Doors Outlines (Bottom side) */}
            <path d="M 155,108 L 195,108 L 195,118 L 155,118 Z" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" />
            <path d="M 199,108 L 245,108 L 245,118 L 199,118 Z" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" />

            {/* B-Pillar Center Divider */}
            <line x1="197" y1="26" x2="197" y2="122" stroke="#475569" strokeWidth="1.5" />

            {/* Rear Windshield */}
            <path d="M 252,32 C 248,44 248,104 252,116 L 268,116 C 263,104 263,44 268,32 Z" fill="#0284c7" fillOpacity="0.25" stroke="#0284c7" />

            {/* Trunk / Boot with Spare Wheel Indicator */}
            <circle cx="318" cy="74" r="20" fill="#0f172a" stroke="#475569" strokeWidth="1.3" strokeDasharray="3,2" />
            <circle cx="318" cy="74" r="10" fill="none" stroke="#64748b" strokeWidth="1" />
            <text x="318" y="77" fontSize="7" fontFamily="monospace" fill="#94a3b8" textAnchor="middle" fontWeight="bold">SPARE</text>

            {/* Rear Bumper & Taillights */}
            <path d="M 382,36 C 390,42 390,106 382,112" strokeWidth="1.8" stroke="#ef4444" />
            <rect x="372" y="32" width="6" height="10" rx="1.5" fill="#ef4444" stroke="#b91c1c" />
            <rect x="372" y="106" width="6" height="10" rx="1.5" fill="#ef4444" stroke="#b91c1c" />

            {/* 4 Wheels / Tires with rims */}
            {/* Front Left */}
            <rect x="98" y="10" width="24" height="14" rx="3" fill="#020617" stroke="#64748b" strokeWidth="1.5" />
            {/* Front Right */}
            <rect x="98" y="124" width="24" height="14" rx="3" fill="#020617" stroke="#64748b" strokeWidth="1.5" />
            {/* Rear Left */}
            <rect x="298" y="10" width="24" height="14" rx="3" fill="#020617" stroke="#64748b" strokeWidth="1.5" />
            {/* Rear Right */}
            <rect x="298" y="124" width="24" height="14" rx="3" fill="#020617" stroke="#64748b" strokeWidth="1.5" />

            {/* Direction Indicator */}
            <path d="M 20,74 L 10,74 M 14,70 L 10,74 L 14,78" stroke="#38bdf8" strokeWidth="1.5" />
            <text x="18" y="66" fontSize="6.5" fontFamily="monospace" fill="#38bdf8" textAnchor="middle">FRONT</text>
            <text x="404" y="76" fontSize="6.5" fontFamily="monospace" fill="#ef4444" textAnchor="middle">REAR</text>
          </g>
        </svg>

        {/* Dynamic Placed Markers */}
        {markers.map((marker, index) => {
          const cfg = DEFECT_CONFIG[marker.type] || DEFECT_CONFIG.DENT;
          return (
            <div
              key={marker.id || index}
              onClick={(e) => handleRemoveMarker(marker.id, e)}
              onMouseEnter={() => setHoveredMarker(marker.id)}
              onMouseLeave={() => setHoveredMarker(null)}
              className="defect-marker-badge absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer z-10 transition-transform hover:scale-125"
              style={{
                left: `${marker.x}%`,
                top: `${marker.y}%`,
              }}
              title={readOnly ? `${marker.type}` : `Click to delete: ${marker.type}`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg ${cfg.bg} ring-2 ring-white/80 animate-pulse`}
              >
                {cfg.badge}
              </div>

              {hoveredMarker === marker.id && !readOnly && (
                <div className="absolute left-1/2 -translate-x-1/2 -top-7 px-2 py-0.5 rounded bg-black/90 text-white text-[10px] whitespace-nowrap shadow-md pointer-events-none z-20 font-mono">
                  Delete {marker.type}
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state hint */}
        {markers.length === 0 && !readOnly && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900/90 rounded-full border border-slate-700/80 text-[11px] text-slate-400 flex items-center gap-1.5 shadow pointer-events-none">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Tap anywhere on the car to record damage locations</span>
          </div>
        )}
      </div>

      {/* Defect Legend Bar */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 mt-2 px-1">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> [D] Dent ({counts.DENT})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" /> [S] Scratch ({counts.SCRATCH})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> [C] Chip ({counts.CHIP})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> [R] Rust ({counts.RUST})
          </span>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Total Recorded Defects: {markers.length}
        </div>
      </div>
    </div>
  );
}
