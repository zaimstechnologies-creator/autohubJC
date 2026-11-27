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
      className={`relative flex min-w-0 flex-col justify-between overflow-hidden rounded-2xl border shadow-sm dark:shadow-lg transition-all duration-300 ${
        card
          ? isReady
            ? 'bg-gradient-to-b from-emerald-50 to-white border-emerald-500/70 shadow-emerald-500/10 dark:from-emerald-950/60 dark:to-slate-900 dark:border-emerald-500/80 dark:shadow-emerald-950/40'
            : isClosed
            ? 'bg-slate-100 border-slate-200 opacity-75 dark:bg-slate-900/40 dark:border-slate-800 dark:opacity-60'
            : 'bg-white border-slate-200 hover:border-slate-300 dark:bg-slate-900/90 dark:border-slate-700/80 dark:hover:border-slate-600'
          : 'bg-slate-50 border-dashed border-slate-300 hover:border-slate-400 dark:bg-slate-950/40 dark:border-slate-800 dark:hover:border-slate-700'
      } ${isLocked || moving ? 'pointer-events-none opacity-50' : ''}`}
      style={{ minHeight: '230px' }}
    >
      {/* Top Bay Header */}
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2.5 sm:px-3.5 ${
          isCarWash
            ? 'bg-sky-50 border-sky-200 dark:bg-sky-950/40 dark:border-sky-800/40'
            : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40'
        }`}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {isCarWash ? (
            <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          ) : (
            <Wrench className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          )}
          <span className="min-w-0 break-words text-[11px] font-bold uppercase leading-snug tracking-wider text-slate-800 dark:text-slate-200 sm:text-xs">
            {bayName}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isLocked && (
            <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800">
              <Lock className="w-2.5 h-2.5 animate-spin" /> Locked
            </span>
          )}
          <span
            className={`max-w-full whitespace-normal rounded px-2 py-1 text-center font-mono text-[9px] font-bold leading-tight sm:py-0.5 sm:text-[10px] ${
              card
                ? isReady
                  ? 'bg-emerald-500 text-slate-950 font-black animate-pulse'
                  : 'bg-slate-100 text-amber-700 border border-slate-300 dark:bg-slate-800 dark:text-amber-300 dark:border-slate-700'
                : 'bg-slate-200/80 text-slate-600 dark:bg-slate-900 dark:text-slate-500'
            }`}
          >
            {card ? card.status.replace(/_/g, ' ') : 'VACANT'}
          </span>
        </div>
      </div>

      {/* Card Body */}
      {card ? (
        <div className="flex flex-1 flex-col justify-between space-y-2.5 p-3 sm:p-3.5">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="mb-1 inline-block max-w-full break-all rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-amber-700 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-400">
                  {card.plate_number}
                </span>
                <h4 className="break-words text-sm font-bold leading-snug tracking-tight text-slate-900 dark:text-white">
                  {card.make_model} {card.variant ? `(${card.variant})` : ''}
                </h4>
              </div>

              <Link
                href={`/workshop/job-card/${card.id}`}
                className="flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                title="Open Job Card"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="mt-1 flex flex-wrap items-start justify-between gap-x-2 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="min-w-0 break-words">Customer: {card.customer_name}</span>
              <span className="break-all font-mono text-[10px] text-slate-500 sm:break-normal sm:text-[11px]">
                {card.customer_phone}
              </span>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="space-y-1.5 pt-1.5 border-t border-slate-200 dark:border-slate-800/80">
            {/* Fuel level & markers */}
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10.5px]">
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Fuel className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                {card.fuel_level_percent}% Fuel
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                {card.inspection_markers?.length || 0} Exterior Defects
              </span>
            </div>

            {/* Departments */}
            {card.departments && card.departments.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {card.departments.slice(0, 3).map((dept) => (
                  <span
                    key={dept}
                    className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 dark:border-transparent dark:bg-slate-800 dark:text-slate-300 font-medium"
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
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800/80 pt-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoveMenu(!showMoveMenu)}
                className="flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-200 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                title="Move vehicle to another bay"
              >
                <ArrowRightLeft className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                Move Bay
              </button>

              {/* Move Bay Dropdown */}
              {showMoveMenu && (
                <div className="absolute left-0 bottom-full mb-1 w-64 bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-700 rounded-xl shadow-2xl p-2 z-30 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                    Transfer Vehicle To:
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 px-1 mb-1">
                      Workshop Bays:
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {WORKSHOP_BAYS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleQuickMove('WORKSHOP', b.id)}
                          className="px-1.5 py-1 text-[10px] rounded bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-800 dark:bg-slate-800 dark:text-slate-200 transition font-mono truncate"
                        >
                          Bay {b.id}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-semibold text-sky-600 dark:text-sky-400 px-1 mb-1">
                      Car Wash Bays:
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {CAR_WASH_BAYS.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => handleQuickMove('CAR_WASH', b.id)}
                          className="px-1.5 py-1 text-[10px] rounded bg-slate-100 hover:bg-sky-500 hover:text-slate-950 text-slate-800 dark:bg-slate-800 dark:text-slate-200 transition font-mono truncate"
                        >
                          Wash {b.id}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-1">
              {!isReady && !isClosed && (
                <button
                  type="button"
                  onClick={() => handleSetStatus('READY_FOR_DELIVERY')}
                  className="flex min-h-9 items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow transition hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600"
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
                  className="flex min-h-9 items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[11px] font-semibold text-white transition hover:bg-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600"
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
        <div className="flex flex-1 flex-col items-center justify-center space-y-1 p-4 text-center">
          <Car className="w-7 h-7 text-slate-300 dark:text-slate-700 stroke-[1.5]" />
          <p className="text-xs font-semibold text-slate-500">Bay Available</p>
          <Link
            href={`/workshop/job-card/new?category=${category}&bay=${bayNumber}`}
            className="text-[11px] text-amber-600 hover:text-amber-500 dark:text-amber-400/80 dark:hover:text-amber-300 font-medium hover:underline pt-1 inline-block"
          >
            + Assign Vehicle
          </Link>
        </div>
      )}
    </div>
  );
}
