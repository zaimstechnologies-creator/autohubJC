'use client';

import React, { useState, useMemo } from 'react';
import {
  JobCard,
  BayCategory,
  WORKSHOP_BAYS,
  CAR_WASH_BAYS,
} from '@/types';
import BayMatrixCard from '@/components/BayMatrixCard';
import AuthSessionButton from '@/components/AuthSessionButton';
import {
  Wrench,
  Droplets,
  Tv,
  Smartphone,
  PlusCircle,
  Search,
  CheckCircle2,
  DollarSign,
  Clock,
  Sparkles,
  RefreshCw,
  Archive,
  Layers,
  Settings,
  Car,
  Filter,
  CreditCard,
  FileText,
  Lock,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useJobCards } from '@/hooks/useJobCards';

const BUSINESS_TIME_ZONE = 'Asia/Karachi';

function businessDateKey(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function formatHours(hours: number) {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)} Hrs`;
}

export default function WorkshopDashboard() {
  const { jobCards, loading, loadJobCards } = useJobCards();
  const [activeTab, setActiveTab] = useState<'matrix' | 'cards' | 'closed' | 'archive' | 'settings'>('matrix');
  const [selectedBayFilter, setSelectedBayFilter] = useState<'ALL' | 'WORKSHOP' | 'CAR_WASH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [lockedCardIds, setLockedCardIds] = useState<Set<string>>(new Set());
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [youtubePlaylistId, setYoutubePlaylistId] = useState('PLfWI-z1AjtsA');
  // Mutex Lock helper
  const acquireLock = (cardId: string) => {
    setLockedCardIds((prev) => new Set(prev).add(cardId));
  };
  const releaseLock = (cardId: string) => {
    setLockedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(cardId);
      return next;
    });
  };

  // Move Bay with Concurrency Mutex
  const handleMoveBay = async (
    cardId: string,
    newCategory: BayCategory,
    newBayNumber: number,
    lastUpdatedAt: string
  ) => {
    acquireLock(cardId);
    try {
      const res = await fetch('/api/jobcards/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cardId,
          bay_category: newCategory,
          bay_number: newBayNumber,
          lastUpdatedAt,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to reassign bay.');
      } else {
        toast.success('Vehicle reassigned to the selected bay.');
      }
      await loadJobCards();
    } catch (err: any) {
      toast.error(`Reassign error: ${err.message}`);
    } finally {
      releaseLock(cardId);
    }
  };

  // Update Status with Concurrency Mutex
  const handleUpdateStatus = async (
    cardId: string,
    newStatus: JobCard['status'],
    lastUpdatedAt: string
  ) => {
    acquireLock(cardId);
    try {
      const res = await fetch('/api/jobcards/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: cardId,
          status: newStatus,
          lastUpdatedAt,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Failed to update status.');
      } else {
        toast.success('Job card status updated.');
      }
      await loadJobCards();
    } catch (err: any) {
      toast.error(`Status update error: ${err.message}`);
    } finally {
      releaseLock(cardId);
    }
  };

  // Executive HUD Metrics
  const activeCards = useMemo(
    () => jobCards.filter((c) => c.status !== 'CLOSED_PAID'),
    [jobCards]
  );
  const readyCards = useMemo(
    () => jobCards.filter((c) => c.status === 'READY_FOR_DELIVERY'),
    [jobCards]
  );
  const closedTodayCards = useMemo(() => {
    const today = businessDateKey(new Date().toISOString());
    return jobCards.filter(
      (c) =>
        c.status === 'CLOSED_PAID' &&
        businessDateKey(c.closed_at || c.updated_at) === today
    );
  }, [jobCards]);

  const totalInvoicedRevenue = useMemo(() => {
    return closedTodayCards.reduce((sum, c) => sum + (Number(c.net_payable) || 0), 0);
  }, [closedTodayCards]);

  const averageTurnaroundHours = useMemo(() => {
    const completedDurations = closedTodayCards
      .map((card) => {
        const startedAt = new Date(card.created_at).getTime();
        const completedAt = new Date(card.closed_at || card.updated_at).getTime();
        const duration = completedAt - startedAt;
        return Number.isFinite(duration) && duration >= 0 ? duration / 3_600_000 : null;
      })
      .filter((duration): duration is number => duration !== null);

    if (completedDurations.length === 0) return null;
    return completedDurations.reduce((sum, duration) => sum + duration, 0) / completedDurations.length;
  }, [closedTodayCards]);

  const aiFirstPassRate = useMemo(() => {
    const cardsWithConcern = jobCards.filter((card) => card.customer_concern?.trim());
    if (cardsWithConcern.length === 0) return null;

    const diagnosesCompleted = cardsWithConcern.filter((card) => card.ai_diagnosis_result).length;
    return (diagnosesCompleted / cardsWithConcern.length) * 100;
  }, [jobCards]);

  // Filtered Cards for Registry
  const filteredRegistry = useMemo(() => {
    let list = jobCards;
    if (activeTab === 'cards') {
      list = activeCards;
    } else if (activeTab === 'closed') {
      list = closedTodayCards;
    } else if (activeTab === 'archive') {
      list = jobCards.filter((c) => c.status === 'CLOSED_PAID');
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().replace(/\s+/g, '');
    return list.filter((c) => {
      const plate = (c.plate_number || '').toLowerCase().replace(/\s+/g, '');
      const name = (c.customer_name || '').toLowerCase();
      const ro = (c.job_card_number || '').toLowerCase();
      const model = (c.make_model || '').toLowerCase();
      return plate.includes(q) || name.includes(q) || ro.includes(q) || model.includes(q);
    });
  }, [jobCards, activeTab, activeCards, closedTodayCards, searchQuery]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-slate-800/80 bg-slate-950/95 px-3 py-3 backdrop-blur-md sm:px-6 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3 lg:w-auto">
          <div className="bg-white p-1 rounded-xl shadow-md border border-slate-700/40 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              className="h-9 w-auto shrink-0 object-contain sm:h-10"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-sm font-black uppercase tracking-tight text-white sm:text-base">
                Al Shaheen Auto Hub
              </h1>
              <span className="rounded-full border border-[#ba1825]/40 bg-[#ba1825]/20 px-2 py-0.5 font-mono text-[9px] font-bold text-rose-300 sm:text-[10px]">
                Enterprise OS
              </span>
            </div>
            <p className="text-[10px] leading-snug text-slate-400 sm:text-[11px]">
              Main Bedian Road, DHA Phase 6, Lahore • Tel: +92 344-1411123
            </p>
          </div>
        </div>

        {/* Global Action Links */}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-2.5 lg:w-auto">
          <Link
            href="/tv"
            target="_blank"
            className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-slate-900 px-2.5 py-2 text-center text-[11px] font-bold leading-tight text-sky-400 shadow transition hover:bg-slate-800 sm:px-3.5 sm:text-xs"
          >
            <Tv className="h-4 w-4 shrink-0 text-sky-400" />
            60" Lounge TV (Live)
          </Link>
          <Link
            href="/track"
            target="_blank"
            className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-slate-900 px-2.5 py-2 text-center text-[11px] font-bold leading-tight text-emerald-400 shadow transition hover:bg-slate-800 sm:px-3.5 sm:text-xs"
          >
            <Smartphone className="h-4 w-4 shrink-0 text-emerald-400" />
            Customer Tracker
          </Link>

          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="AI & Lounge Settings"
            aria-label="AI and lounge settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={loadJobCards}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title="Refresh Data"
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <AuthSessionButton fullWidth />

          <Link
            href="/workshop/job-card/new"
            className="col-span-2 flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#ba1825] px-4 py-2 text-center text-xs font-bold leading-tight text-white shadow-lg shadow-rose-950/40 transition hover:bg-[#a1141f] sm:col-span-1 sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" />
            Create New Job Card
          </Link>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 space-y-4 p-3 sm:space-y-6 sm:p-6">
        {/* Executive Operations HUD */}
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active in Workshop
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-white">
                {activeCards.length}
              </span>
              <span className="text-xs text-amber-400 font-medium">Bays Engaged</span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-emerald-500/40 bg-slate-900/80 p-3 shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
              Ready for Exit
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-emerald-400 animate-pulse">
                {readyCards.length}
              </span>
              <span className="text-[10px] text-emerald-300/80 font-mono">Announced</span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Settled Today
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-white">
                {closedTodayCards.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Vehicles</span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-amber-500/40 bg-slate-900/80 p-3 shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
              Total Invoiced (PKR)
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-xl font-black font-mono text-amber-400 truncate">
                {totalInvoicedRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Avg Turnaround
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-sky-400">
                {averageTurnaroundHours === null ? '—' : formatHours(averageTurnaroundHours)}
              </span>
              <span className="text-[10px] text-slate-500">
                {averageTurnaroundHours === null ? 'No completions today' : 'Today'}
              </span>
            </div>
          </div>

          <div
            className="min-w-0 rounded-2xl border border-purple-500/40 bg-slate-900/80 p-3 shadow sm:p-3.5"
            title="Share of job cards with a customer concern that have a saved AI diagnosis"
          >
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
              AI First-Pass
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-purple-300">
                {aiFirstPassRate === null ? '—' : `${aiFirstPassRate.toFixed(1)}%`}
              </span>
              <span className="text-[10px] text-purple-400/80">
                {aiFirstPassRate === null ? 'No diagnostics yet' : 'Completed'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab & Navigation Controls */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-center text-[10px] font-bold leading-tight transition sm:px-3.5 sm:text-xs ${
                activeTab === 'matrix'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="h-4 w-4 shrink-0" />
              12-Bay Matrix
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-center text-[10px] font-bold leading-tight transition sm:px-3.5 sm:text-xs ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
              aria-label={`Active Job Cards (${activeCards.length})`}
            >
              <Car className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Active ({activeCards.length})</span>
              <span className="hidden sm:inline">Active Job Cards ({activeCards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('closed')}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-center text-[10px] font-bold leading-tight transition sm:px-3.5 sm:text-xs ${
                activeTab === 'closed'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
              aria-label={`Closed & Paid Today (${closedTodayCards.length})`}
            >
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Closed ({closedTodayCards.length})</span>
              <span className="hidden sm:inline">Closed & Paid Today ({closedTodayCards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-center text-[10px] font-bold leading-tight transition sm:px-3.5 sm:text-xs ${
                activeTab === 'archive'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Archive className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Archive</span>
              <span className="hidden sm:inline">Archive Ledger</span>
            </button>
          </div>

          {activeTab === 'matrix' && (
            <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-950 p-1 text-[10px] sm:flex sm:w-auto sm:gap-1.5 sm:text-xs">
              <button
                type="button"
                onClick={() => setSelectedBayFilter('ALL')}
                aria-label="Show all 12 bays"
                className={`min-h-9 rounded-lg px-1.5 py-1 font-semibold transition sm:px-2.5 ${
                  selectedBayFilter === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="sm:hidden">All Bays</span>
                <span className="hidden sm:inline">All 12 Bays</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedBayFilter('WORKSHOP')}
                aria-label="Show 6 workshop bays"
                className={`min-h-9 rounded-lg px-1.5 py-1 font-semibold transition sm:px-2.5 ${
                  selectedBayFilter === 'WORKSHOP'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="sm:hidden">Workshop</span>
                <span className="hidden sm:inline">6 Workshop Bays</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedBayFilter('CAR_WASH')}
                aria-label="Show 6 wash bays"
                className={`min-h-9 rounded-lg px-1.5 py-1 font-semibold transition sm:px-2.5 ${
                  selectedBayFilter === 'CAR_WASH'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="sm:hidden">Wash</span>
                <span className="hidden sm:inline">6 Wash Bays</span>
              </button>
            </div>
          )}

          {activeTab !== 'matrix' && (
            <div className="relative w-full sm:min-w-[240px] sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Plate, Name, RO #..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        {/* TAB 1: 12-BAY MATRIX VIEW */}
        {activeTab === 'matrix' && (
          <div className="min-w-0 space-y-6 sm:space-y-8">
            {/* Workshop Bays (1–6) */}
            {(selectedBayFilter === 'ALL' || selectedBayFilter === 'WORKSHOP') && (
              <div className="min-w-0 space-y-3">
                <div className="flex flex-col gap-1 border-b border-slate-800 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                    <h3 className="min-w-0 text-xs font-bold uppercase leading-snug tracking-wider text-white sm:text-sm">
                      Workshop Bays (Diagnostics, Mechanical & Detailing)
                    </h3>
                  </div>
                  <span className="pl-7 font-mono text-[10px] text-slate-500 sm:pl-0 sm:text-xs">Bays 1 to 6</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {WORKSHOP_BAYS.map((bay) => {
                    const assignedCard = activeCards.find(
                      (c) => c.bay_category === 'WORKSHOP' && Number(c.bay_number) === bay.id
                    );
                    const isLocked = assignedCard ? lockedCardIds.has(assignedCard.id) : false;

                    return (
                      <BayMatrixCard
                        key={`ws_${bay.id}`}
                        category="WORKSHOP"
                        bayNumber={bay.id}
                        bayName={bay.name}
                        card={assignedCard}
                        isLocked={isLocked}
                        onMoveBay={handleMoveBay}
                        onUpdateStatus={handleUpdateStatus}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Car Wash Bays (1–6) */}
            {(selectedBayFilter === 'ALL' || selectedBayFilter === 'CAR_WASH') && (
              <div className="min-w-0 space-y-3">
                <div className="flex flex-col gap-1 border-b border-slate-800 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" />
                    <h3 className="min-w-0 text-xs font-bold uppercase leading-snug tracking-wider text-white sm:text-sm">
                      Car Wash & Detailing Bays (1–6)
                    </h3>
                  </div>
                  <span className="pl-7 font-mono text-[10px] text-slate-500 sm:pl-0 sm:text-xs">Wash Bays 1 to 6</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {CAR_WASH_BAYS.map((bay) => {
                    const assignedCard = activeCards.find(
                      (c) => c.bay_category === 'CAR_WASH' && Number(c.bay_number) === bay.id
                    );
                    const isLocked = assignedCard ? lockedCardIds.has(assignedCard.id) : false;

                    return (
                      <BayMatrixCard
                        key={`cw_${bay.id}`}
                        category="CAR_WASH"
                        bayNumber={bay.id}
                        bayName={bay.name}
                        card={assignedCard}
                        isLocked={isLocked}
                        onMoveBay={handleMoveBay}
                        onUpdateStatus={handleUpdateStatus}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2, 3, 4: CARDS / CLOSED / ARCHIVE DATABASE */}
        {activeTab !== 'matrix' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                    <th className="py-3 px-4">RO #</th>
                    <th className="py-3 px-4">Plate No</th>
                    <th className="py-3 px-4">Make & Model</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Assigned Bay</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Net Payable</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/30">
                  {filteredRegistry.map((card) => {
                    const isReady = card.status === 'READY_FOR_DELIVERY';
                    const isClosed = card.status === 'CLOSED_PAID';

                    return (
                      <tr key={card.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">
                          {card.job_card_number}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-white">
                          <span className="px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/30">
                            {card.plate_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          {card.make_model} {card.variant ? `(${card.variant})` : ''}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">{card.customer_name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {card.customer_phone}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-mono">
                          {card.bay_category === 'CAR_WASH' ? 'Wash Bay' : 'Workshop Bay'}{' '}
                          {card.bay_number}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isReady
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                                : isClosed
                                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {card.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-400">
                          {(card.net_payable || 0).toLocaleString()} PKR
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/workshop/job-card/${card.id}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition text-[11px] font-semibold"
                            >
                              Edit / Print
                            </Link>

                            {!isClosed && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(card.id, 'CLOSED_PAID', card.updated_at)}
                                className="px-2 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white transition text-[11px] font-bold"
                                title="Settle & Mark Paid"
                              >
                                Settle
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRegistry.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 italic">
                        No records match the current filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {settingsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-400" />
                Workshop & AI / TV Configuration
              </h3>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  YouTube Playlist ID (60" Lounge TV)
                </label>
                <input
                  type="text"
                  value={youtubePlaylistId}
                  onChange={(e) => setYoutubePlaylistId(e.target.value)}
                  placeholder="e.g. PLw-VjHDlEOgs658kAHR_LAaILBXb-s6Q5"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Configured YouTube IFrame Player list for lounge media stream.
                </span>
              </div>

              <p className="text-xs text-slate-400">
                AI diagnostics use the server-side GEMINI_API_KEY configuration. API keys are never entered or stored in this browser.
              </p>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
