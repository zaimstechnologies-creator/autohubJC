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
  Sun,
  Moon,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useJobCards } from '@/hooks/useJobCards';
import { useTheme } from '@/components/ThemeProvider';

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
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'matrix' | 'cards' | 'closed' | 'archive' | 'settings'>('matrix');
  const [selectedBayFilter, setSelectedBayFilter] = useState<'ALL' | 'WORKSHOP' | 'CAR_WASH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [lockedCardIds, setLockedCardIds] = useState<Set<string>>(new Set());
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [settlementDialogCard, setSettlementDialogCard] = useState<JobCard | null>(null);
  const [isSettlementSaving, setIsSettlementSaving] = useState(false);
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
  const updateJobCardStatus = async (
    cardId: string,
    newStatus: JobCard['status'],
    lastUpdatedAt: string,
    printAfterUpdate = false
  ): Promise<boolean> => {
    const printWindow = printAfterUpdate ? window.open('about:blank', '_blank') : null;
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
        printWindow?.close();
        toast.error(json.error || 'Failed to update status.');
      } else {
        toast.success('Job card status updated.');
        if (printAfterUpdate) {
          if (printWindow && !printWindow.closed) {
            printWindow.location.href = `/workshop/job-card/${encodeURIComponent(cardId)}?print=1`;
          } else {
            toast.error('Job card settled, but the print window was blocked. Open the job card and use Print A4 Job Card.');
          }
        }
      }
      await loadJobCards();
      return res.ok;
    } catch (err: any) {
      printWindow?.close();
      toast.error(`Status update error: ${err.message}`);
      return false;
    } finally {
      releaseLock(cardId);
    }
  };

  const handleUpdateStatus = async (
    cardId: string,
    newStatus: JobCard['status'],
    lastUpdatedAt: string
  ) => {
    if (newStatus === 'CLOSED_PAID') {
      const card = jobCards.find((jobCard) => jobCard.id === cardId);
      if (!card) {
        toast.error('Could not find the job card to settle.');
        return;
      }
      setSettlementDialogCard(card);
      return;
    }

    await updateJobCardStatus(cardId, newStatus, lastUpdatedAt);
  };

  const handleSettlementChoice = async (savePdf: boolean) => {
    if (!settlementDialogCard || isSettlementSaving) return;

    setIsSettlementSaving(true);
    try {
      const updated = await updateJobCardStatus(
        settlementDialogCard.id,
        'CLOSED_PAID',
        settlementDialogCard.updated_at,
        savePdf
      );
      if (updated) setSettlementDialogCard(null);
    } finally {
      setIsSettlementSaving(false);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b14] dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-950/95 sm:px-6 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3 lg:w-auto">
          <div className="bg-white p-1 rounded-xl shadow-md border border-slate-200 dark:border-slate-700/40 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              className="h-9 w-auto shrink-0 object-contain sm:h-10"
            />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h1 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white sm:text-base">
                Al Shaheen Auto Hub
              </h1>
              <span className="rounded-full border border-[#ba1825]/30 bg-[#ba1825]/10 px-2 py-0.5 font-mono text-[9px] font-bold text-[#ba1825] dark:border-[#ba1825]/40 dark:bg-[#ba1825]/20 dark:text-rose-300 sm:text-[10px]">
                Enterprise OS
              </span>
            </div>
            <p className="text-[10px] leading-snug text-slate-500 dark:text-slate-400 sm:text-[11px]">
              Main Bedian Road, DHA Phase 6, Lahore • Tel: +92 344-1411123
            </p>
          </div>
        </div>

        {/* Global Action Links */}
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end sm:gap-2.5 lg:w-auto">
          <Link
            href="/tv"
            target="_blank"
            className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-sky-500/30 bg-white px-2.5 py-2 text-center text-[11px] font-bold leading-tight text-sky-600 shadow-sm transition hover:bg-sky-50 dark:bg-slate-900 dark:text-sky-400 dark:shadow dark:hover:bg-slate-800 sm:px-3.5 sm:text-xs"
          >
            <Tv className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            60" Lounge TV (Live)
          </Link>
          <Link
            href="/track"
            target="_blank"
            className="flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-white px-2.5 py-2 text-center text-[11px] font-bold leading-tight text-emerald-600 shadow-sm transition hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-400 dark:shadow dark:hover:bg-slate-800 sm:px-3.5 sm:text-xs"
          >
            <Smartphone className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            Customer Tracker
          </Link>

          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title="AI & Lounge Settings"
            aria-label="AI and lounge settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={loadJobCards}
            className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
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
          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Active in Workshop
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {activeCards.length}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Bays Engaged</span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-emerald-500/40 bg-white p-3 shadow-sm dark:bg-slate-900/80 dark:shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Ready for Exit
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 animate-pulse">
                {readyCards.length}
              </span>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-300/80 font-mono">Announced</span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Settled Today
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                {closedTodayCards.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Vehicles</span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-amber-500/40 bg-white p-3 shadow-sm dark:bg-slate-900/80 dark:shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Total Invoiced (PKR)
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-xl font-black font-mono text-amber-600 dark:text-amber-400 truncate">
                {totalInvoicedRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 dark:shadow sm:p-3.5">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Avg Turnaround
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">
                {averageTurnaroundHours === null ? '—' : formatHours(averageTurnaroundHours)}
              </span>
              <span className="text-[10px] text-slate-500">
                {averageTurnaroundHours === null ? 'No completions today' : 'Today'}
              </span>
            </div>
          </div>

          <div
            className="min-w-0 rounded-2xl border border-purple-500/40 bg-white p-3 shadow-sm dark:bg-slate-900/80 dark:shadow sm:p-3.5"
            title="Share of job cards with a customer concern that have a saved AI diagnosis"
          >
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
              AI First-Pass
            </span>
            <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-2">
              <span className="text-2xl font-black font-mono text-purple-600 dark:text-purple-300">
                {aiFirstPassRate === null ? '—' : `${aiFirstPassRate.toFixed(1)}%`}
              </span>
              <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80">
                {aiFirstPassRate === null ? 'No diagnostics yet' : 'Completed'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab & Navigation Controls */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:shadow-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <div className="grid grid-cols-2 gap-1.5 sm:flex sm:flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`flex min-h-10 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-center text-[10px] font-bold leading-tight transition sm:px-3.5 sm:text-xs ${
                activeTab === 'matrix'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white'
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
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white'
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
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white'
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
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Archive className="h-4 w-4 shrink-0" />
              <span className="sm:hidden">Archive</span>
              <span className="hidden sm:inline">Archive Ledger</span>
            </button>
          </div>

          {activeTab === 'matrix' && (
            <div className="grid w-full grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 text-[10px] dark:border-slate-800 dark:bg-slate-950 sm:flex sm:w-auto sm:gap-1.5 sm:text-xs">
              <button
                type="button"
                onClick={() => setSelectedBayFilter('ALL')}
                aria-label="Show all 12 bays"
                className={`min-h-9 rounded-lg px-1.5 py-1 font-semibold transition sm:px-2.5 ${
                  selectedBayFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white dark:shadow-none'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
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
                    ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
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
                    ? 'bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/40'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span className="sm:hidden">Wash</span>
                <span className="hidden sm:inline">6 Wash Bays</span>
              </button>
            </div>
          )}

          {activeTab !== 'matrix' && (
            <div className="relative w-full sm:min-w-[240px] sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Plate, Name, RO #..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 dark:bg-slate-950 dark:border-slate-800 dark:text-white dark:placeholder-slate-500"
              />
            </div>
          )}

          {settlementDialogCard && (
            <div
              className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
              onClick={() => {
                if (!isSettlementSaving) setSettlementDialogCard(null);
              }}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="settlement-dialog-title"
                className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:p-6"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="mb-4 flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <CreditCard className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 id="settlement-dialog-title" className="text-lg font-bold text-slate-900 dark:text-white">
                      Settle Job Card
                    </h2>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {settlementDialogCard.job_card_number} · {settlementDialogCard.customer_name}
                    </p>
                  </div>
                </div>

                <p className="mb-5 text-sm text-slate-600 dark:text-slate-300">
                  Choose whether to open the PDF print dialog after marking this job card as paid.
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => void handleSettlementChoice(true)}
                    disabled={isSettlementSaving}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-wait disabled:opacity-60"
                  >
                    <FileText className="h-4 w-4" />
                    {isSettlementSaving ? 'Updating...' : 'Save PDF & Close'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleSettlementChoice(false)}
                    disabled={isSettlementSaving}
                    className="min-h-11 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-200 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                  >
                    Just Update
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: 12-BAY MATRIX VIEW */}
        {activeTab === 'matrix' && (
          <div className="min-w-0 space-y-6 sm:space-y-8">
            {/* Workshop Bays (1–6) */}
            {(selectedBayFilter === 'ALL' || selectedBayFilter === 'WORKSHOP') && (
              <div className="min-w-0 space-y-3">
                <div className="flex flex-col gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <Wrench className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400" />
                    <h3 className="min-w-0 text-xs font-bold uppercase leading-snug tracking-wider text-slate-900 dark:text-white sm:text-sm">
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
                <div className="flex flex-col gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-2">
                    <Droplets className="mt-0.5 h-5 w-5 shrink-0 text-sky-500 dark:text-sky-400" />
                    <h3 className="min-w-0 text-xs font-bold uppercase leading-snug tracking-wider text-slate-900 dark:text-white sm:text-sm">
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
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm dark:bg-slate-900/80 dark:border-slate-800 dark:shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 font-semibold dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
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
                <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800/60 dark:bg-slate-900/30">
                  {filteredRegistry.map((card) => {
                    const isReady = card.status === 'READY_FOR_DELIVERY';
                    const isClosed = card.status === 'CLOSED_PAID';

                    return (
                      <tr key={card.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {card.job_card_number}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-slate-900 dark:text-white">
                          <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 border border-amber-500/30 dark:bg-amber-400/10 dark:text-amber-300 dark:border-amber-400/30">
                            {card.plate_number}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {card.make_model} {card.variant ? `(${card.variant})` : ''}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">{card.customer_name}</div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {card.customer_phone}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-mono">
                          {card.bay_category === 'CAR_WASH' ? 'Wash Bay' : 'Workshop Bay'}{' '}
                          {card.bay_number}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isReady
                                ? 'bg-emerald-500/15 text-emerald-700 border border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-400 animate-pulse'
                                : isClosed
                                ? 'bg-blue-500/15 text-blue-700 border border-blue-500/40 dark:bg-blue-500/20 dark:text-blue-400'
                                : 'bg-amber-500/15 text-amber-700 border border-amber-500/40 dark:bg-amber-500/20 dark:text-amber-300'
                            }`}
                          >
                            {card.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                          {(card.net_payable || 0).toLocaleString()} PKR
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/workshop/job-card/${card.id}`}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 transition text-[11px] font-semibold"
                            >
                              Edit / Print
                            </Link>

                            {!isClosed && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(card.id, 'CLOSED_PAID', card.updated_at)}
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white transition text-[11px] font-bold"
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
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl dark:bg-slate-900 dark:border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Workshop &amp; AI / TV Configuration
              </h3>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                aria-label="Close settings"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1.5">
                  Appearance Mode
                </label>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    aria-pressed={theme === 'light'}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                      theme === 'light'
                        ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Sun className="h-4 w-4 text-amber-500" />
                    Light Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-bold transition ${
                      theme === 'dark'
                        ? 'bg-slate-800 text-white shadow-sm ring-1 ring-slate-700'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Moon className="h-4 w-4 text-sky-400" />
                    Dark Mode
                  </button>
                </div>
                <span className="text-[10px] text-slate-500 mt-1.5 block">
                  Saved automatically in this browser for future visits.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  YouTube Playlist ID (60" Lounge TV)
                </label>
                <input
                  type="text"
                  value={youtubePlaylistId}
                  onChange={(e) => setYoutubePlaylistId(e.target.value)}
                  placeholder="e.g. PLw-VjHDlEOgs658kAHR_LAaILBXb-s6Q5"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono dark:bg-slate-950 dark:border-slate-700 dark:text-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Configured YouTube IFrame Player list for lounge media stream.
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
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
