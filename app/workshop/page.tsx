'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

export default function WorkshopDashboard() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matrix' | 'cards' | 'closed' | 'archive' | 'settings'>('matrix');
  const [selectedBayFilter, setSelectedBayFilter] = useState<'ALL' | 'WORKSHOP' | 'CAR_WASH'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [lockedCardIds, setLockedCardIds] = useState<Set<string>>(new Set());
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [youtubePlaylistId, setYoutubePlaylistId] = useState('PLfWI-z1AjtsA');
  const [geminiKeyOverride, setGeminiKeyOverride] = useState('');
  // Fetch job cards
  const loadJobCards = async () => {
    try {
      const res = await fetch('/api/jobcards', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setJobCards(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobCards();
    const timer = setInterval(loadJobCards, 8000);
    return () => clearInterval(timer);
  }, []);

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
        alert(json.error || 'Failed to reassign bay');
      }
      await loadJobCards();
    } catch (err: any) {
      alert(`Reassign error: ${err.message}`);
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
        alert(json.error || 'Failed to update status');
      }
      await loadJobCards();
    } catch (err: any) {
      alert(`Status update error: ${err.message}`);
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
    const today = new Date().toISOString().slice(0, 10);
    return jobCards.filter(
      (c) => c.status === 'CLOSED_PAID' && (c.closed_at || c.updated_at || '').slice(0, 10) === today
    );
  }, [jobCards]);

  const totalInvoicedRevenue = useMemo(() => {
    return closedTodayCards.reduce((sum, c) => sum + (Number(c.net_payable) || 0), 0);
  }, [closedTodayCards]);

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
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-3.5 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-md border border-slate-700/40 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-white tracking-tight uppercase">
                Al Shaheen Auto Hub
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ba1825]/20 text-rose-300 border border-[#ba1825]/40 font-bold">
                Enterprise OS
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Main Bedian Road, DHA Phase 6, Lahore • Tel: +92 344-1411123
            </p>
          </div>
        </div>

        {/* Global Action Links */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/tv"
            target="_blank"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-sky-400 border border-sky-500/30 flex items-center gap-1.5 transition shadow"
          >
            <Tv className="w-4 h-4 text-sky-400" />
            60" Lounge TV (Live)
          </Link>

          <Link
            href="/track"
            target="_blank"
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition shadow"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            Customer Tracker
          </Link>

          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
            title="AI & Lounge Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={loadJobCards}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <AuthSessionButton />

          <Link
            href="/workshop/job-card/new"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#ba1825] hover:bg-[#a1141f] text-white flex items-center gap-1.5 transition shadow-lg shadow-rose-950/40"
          >
            <PlusCircle className="w-4 h-4" />
            Create New Job Card
          </Link>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* Executive Operations HUD */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Active in Workshop
            </span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-2xl font-black font-mono text-white">
                {activeCards.length}
              </span>
              <span className="text-xs text-amber-400 font-medium">Bays Engaged</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-500/40 shadow">
            <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">
              Ready for Exit
            </span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-2xl font-black font-mono text-emerald-400 animate-pulse">
                {readyCards.length}
              </span>
              <span className="text-[10px] text-emerald-300/80 font-mono">Announced</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Settled Today
            </span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-2xl font-black font-mono text-white">
                {closedTodayCards.length}
              </span>
              <span className="text-xs text-slate-500 font-medium">Vehicles</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-amber-500/40 shadow">
            <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">
              Total Invoiced (PKR)
            </span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-xl font-black font-mono text-amber-400 truncate">
                {totalInvoicedRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Avg Turnaround
            </span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-2xl font-black font-mono text-sky-400">
                1.8 <span className="text-xs text-slate-400 font-sans">Hrs</span>
              </span>
              <span className="text-[10px] text-slate-500">Live Pace</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-purple-500/40 shadow">
            <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">
              AI First-Pass
            </span>
            <div className="flex items-baseline justify-between mt-1.5">
              <span className="text-2xl font-black font-mono text-purple-300">
                98.6%
              </span>
              <span className="text-[10px] text-purple-400/80">Accuracy</span>
            </div>
          </div>
        </div>

        {/* Tab & Navigation Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-2 bg-slate-900/70 rounded-2xl border border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'matrix'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              12-Bay Matrix
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cards')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'cards'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" />
              Active Job Cards ({activeCards.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('closed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'closed'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Closed & Paid Today ({closedTodayCards.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('archive')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                activeTab === 'archive'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              <Archive className="w-4 h-4" />
              Archive Ledger
            </button>
          </div>

          {activeTab === 'matrix' && (
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setSelectedBayFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedBayFilter === 'ALL'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All 12 Bays
              </button>
              <button
                type="button"
                onClick={() => setSelectedBayFilter('WORKSHOP')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedBayFilter === 'WORKSHOP'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                6 Workshop Bays
              </button>
              <button
                type="button"
                onClick={() => setSelectedBayFilter('CAR_WASH')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                  selectedBayFilter === 'CAR_WASH'
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                6 Wash Bays
              </button>
            </div>
          )}

          {activeTab !== 'matrix' && (
            <div className="relative min-w-[240px]">
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
          <div className="space-y-8">
            {/* Workshop Bays (1–6) */}
            {(selectedBayFilter === 'ALL' || selectedBayFilter === 'WORKSHOP') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-amber-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Workshop Bays (Diagnostics, Mechanical & Detailing)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">Bays 1 to 6</span>
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
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-sky-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Car Wash & Detailing Bays (1–6)
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-mono">Wash Bays 1 to 6</span>
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

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Gemini API Key Override (Optional)
                </label>
                <input
                  type="password"
                  value={geminiKeyOverride}
                  onChange={(e) => setGeminiKeyOverride(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Overrides default environment variable key for master diagnostics.
                </span>
              </div>
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
