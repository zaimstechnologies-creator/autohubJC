'use client';

import React, { useState } from 'react';
import { JobCard, BayCategory, WORKSHOP_BAYS, CAR_WASH_BAYS } from '@/types';
import {
  Car,
  Wrench,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Lock,
  ArrowRightLeft,
  CreditCard,
  Droplets,
  AlertCircle,
  Fuel,
} from 'lucide-react';
import Link from 'next/link';

interface BayMatrixCardProps {
  category: BayCategory;
  bayNumber: number;
  bayName: string;
  card?: JobCard;
  isLocked?: boolean;
  onMoveBay: (cardId: string, newCategory: BayCategory, newBayNumber: number, lastUpdatedAt: string) => Promise<void>;
  onUpdateStatus: (cardId: string, newStatus: JobCard['status'], lastUpdatedAt: string) => Promise<void>;
}

export default function BayMatrixCard({
  category,
  bayNumber,
  bayName,
  card,
  isLocked = false,
  onMoveBay,
  onUpdateStatus,
}: BayMatrixCardProps) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [moving, setMoving] = useState(false);

  const isCarWash = category === 'CAR_WASH';
  const isReady = card?.status === 'READY_FOR_DELIVERY';
  const isClosed = card?.status === 'CLOSED_PAID';

  const handleQuickMove = async (targetCategory: BayCategory, targetBayNum: number) => {
    if (!card) return;
    setMoving(true);
    setShowMoveMenu(false);
    try {
      await onMoveBay(card.id, targetCategory, targetBayNum, card.updated_at);
    } finally {
      setMoving(false);
    }
  };

  const handleSetStatus = async (status: JobCard['status']) => {
    if (!card) return;
    setMoving(true);
    try {
      await onUpdateStatus(card.id, status, card.updated_at);
    } finally {
      setMoving(false);
    }
  };

  return (
    <div
      className={`relative rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg ${
        card
          ? isReady
            ? 'bg-gradient-to-b from-emerald-950/60 to-slate-900 border-emerald-500/80 shadow-emerald-950/40'
            : isClosed
            ? 'bg-slate-900/40 border-slate-800 opacity-60'
            : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600'
          : 'bg-slate-950/40 border-dashed border-slate-800 hover:border-slate-700'
      } ${isLocked || moving ? 'pointer-events-none opacity-50' : ''}`}
      style={{ minHeight: '230px' }}
    >
      {/* Top Bay Header */}
      <div
        className={`px-3.5 py-2.5 flex items-center justify-between border-b ${
          isCarWash
            ? 'bg-sky-950/40 border-sky-800/40'
            : 'bg-amber-950/30 border-amber-800/40'
        }`}
      >
        <div className="flex items-center gap-2">
          {isCarWash ? (
            <Droplets className="w-4 h-4 text-sky-400" />
          ) : (
            <Wrench className="w-4 h-4 text-amber-400" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            {bayName}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isLocked && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800">
              <Lock className="w-2.5 h-2.5 animate-spin" /> Locked
            </span>
          )}
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
              card
                ? isReady
                  ? 'bg-emerald-500 text-slate-950 font-black animate-pulse'
                  : 'bg-slate-800 text-amber-300 border border-slate-700'
                : 'bg-slate-900 text-slate-500'
            }`}
          >
            {card ? card.status.replace(/_/g, ' ') : 'VACANT'}
          </span>
        </div>
      </div>

      {/* Card Body */}
      {card ? (
        <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-xs font-black font-mono tracking-wider px-2 py-0.5 rounded bg-amber-400/10 text-amber-400 border border-amber-400/30 inline-block mb-1">
                  {card.plate_number}
                </span>
                <h4 className="text-sm font-bold text-white tracking-tight leading-snug">
                  {card.make_model} {card.variant ? `(${card.variant})` : ''}
                </h4>
              </div>

              <Link
                href={`/workshop/job-card/${card.id}`}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
                title="Open Job Card"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
              <span>Customer: {card.customer_name}</span>
              <span className="font-mono text-slate-500">{card.customer_phone}</span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-800/80">
            {/* Fuel level & markers */}
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="flex items-center gap-1 text-slate-400">
                <Fuel className="w-3 h-3 text-amber-400" />
                {card.fuel_level_percent}% Fuel
              </span>
              <span className="text-slate-400">
                {card.inspection_markers?.length || 0} Exterior Defects
              </span>
            </div>

            {/* Departments */}
            {card.departments && card.departments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {card.departments.slice(0, 3).map((dept) => (
                  <span
                    key={dept}
                    className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-medium"
                  >
                    {dept}
                  </span>
                ))}
                {card.departments.length > 3 && (
                  <span className="text-[9.5px] text-slate-500">
                    +{card.departments.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Quick Bay Actions */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 flex items-center gap-1 transition"
                title="Move vehicle to another bay"
              >
                <ArrowRightLeft className="w-3 h-3 text-sky-400" />
                Move Bay
              </button>

              {/* Move Bay Dropdown */}
              {showMoveMenu && (
                <div className="absolute left-0 bottom-full mb-1 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-30 space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Transfer Vehicle To:
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-amber-400 px-1 mb-1">
                      Workshop Bays:
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {WORKSHOP_BAYS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleQuickMove('WORKSHOP', b.id)}
                          className="px-1.5 py-1 text-[10px] rounded bg-slate-800 hover:bg-amber-500 hover:text-slate-950 text-slate-200 transition font-mono truncate"
                        >
                          Bay {b.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-sky-400 px-1 mb-1">
                      Car Wash Bays:
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {CAR_WASH_BAYS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleQuickMove('CAR_WASH', b.id)}
                          className="px-1.5 py-1 text-[10px] rounded bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-200 transition font-mono truncate"
                        >
                          Wash {b.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {!isReady && !isClosed && (
                <button
                  type="button"
                  onClick={() => handleSetStatus('READY_FOR_DELIVERY')}
                  className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition flex items-center gap-1 shadow"
                  title="Trigger TV Voice Announcement & Ready Status"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Ready
                </button>
              )}

              {!isClosed && (
                <button
                  type="button"
                  onClick={() => handleSetStatus('CLOSED_PAID')}
                  className="px-2 py-1 text-[11px] font-semibold rounded-lg bg-blue-700 hover:bg-blue-600 text-white transition flex items-center gap-1"
                  title="Mark Paid & Archive"
                >
                  <CreditCard className="w-3 h-3" />
                  Settle
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 flex-1 flex flex-col items-center justify-center text-center space-y-1">
          <Car className="w-7 h-7 text-slate-700 stroke-[1.5]" />
          <p className="text-xs font-semibold text-slate-500">Bay Available</p>
          <Link
            href={`/workshop/job-card/new?category=${category}&bay=${bayNumber}`}
            className="text-[11px] text-amber-400/80 hover:text-amber-300 font-medium hover:underline pt-1 inline-block"
          >
            + Assign Vehicle
          </Link>
        </div>
      )}
    </div>
  );
}
