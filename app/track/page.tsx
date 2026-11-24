'use client';

import React, { useState } from 'react';
import { PublicVehicleStatus, WORKSHOP_BAYS, CAR_WASH_BAYS } from '@/types';
import {
  Search,
  Car,
  Clock,
  CheckCircle2,
  ShieldCheck,
  Wifi,
  Coffee,
  MessageCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

function formatUpdatedAt(value?: string) {
  if (!value) return 'Not available';

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleString();
}

export default function CustomerTrackPage() {
  const [plateInput, setPlateInput] = useState('');
  const [statusData, setStatusData] = useState<PublicVehicleStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLookup = async (plateToSearch?: string) => {
    const query = plateToSearch || plateInput;
    if (!query || query.trim().length === 0) {
      toast.error('Please enter your vehicle registration plate number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/track?plate=${encodeURIComponent(query.trim())}`, {
        cache: 'no-store',
      });
      const json = await res.json();

      if (!res.ok || !json.data) {
        setStatusData(null);
        toast.error(json.error || `No active job card found for plate "${query.trim()}".`);
      } else {
        setStatusData(json.data);
        toast.success('Vehicle status found.');
      }
    } catch {
      toast.error('Unable to reach workshop telemetry server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const bayTitle = statusData
    ? statusData.bay_category === 'CAR_WASH'
      ? CAR_WASH_BAYS.find((b) => b.id === statusData.bay_number)?.name || `Wash Bay ${statusData.bay_number}`
      : WORKSHOP_BAYS.find((b) => b.id === statusData.bay_number)?.name || `Workshop Bay ${statusData.bay_number}`
    : 'Assigned Bay';

  const statusLabel = statusData?.status === 'READY_FOR_DELIVERY'
    ? 'READY FOR DELIVERY'
    : statusData?.status === 'INTAKE'
      ? 'VEHICLE RECEIVED'
      : 'IN SERVICE';

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans pb-16">
      {/* Mobile Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 py-3 sticky top-0 z-30 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="bg-white p-0.5 rounded-lg shadow border border-slate-700/50 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              className="h-8 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-white uppercase tracking-tight">
              Al Shaheen Auto Hub
            </h1>
            <p className="text-[10px] text-slate-400">Live Customer Mobile Tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="https://wa.me/923441411123"
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition hover:bg-emerald-600 hover:text-white"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>Advisor</span>
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-6 space-y-6">
        {/* Lookup Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
          <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
            Track Vehicle Progress
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Car className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={plateInput}
                onChange={(e) => setPlateInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="Enter your vehicle registration plate number"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white uppercase font-mono font-bold tracking-wider placeholder-slate-600 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button
              type="button"
              onClick={() => handleLookup()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition shadow disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              {loading ? 'Tracking...' : 'Track'}
            </button>
          </div>

        </div>

        {/* Live Status Card */}
        {statusData && (
          <div className="space-y-4">
            {/* Vehicle Header Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 inline-block mb-1">
                    {statusData.plate_number}
                  </span>
                  <h2 className="text-base font-extrabold text-white">
                    {statusData.make_model} {statusData.variant ? `(${statusData.variant})` : ''}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => handleLookup()}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
                  title="Refresh vehicle status"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Status Banner */}
              <div
                className={`p-3 rounded-xl flex items-center justify-between border ${
                  statusData.status === 'READY_FOR_DELIVERY'
                    ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 animate-pulse'
                    : 'bg-amber-950/40 border-amber-800/50 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {statusData.status === 'READY_FOR_DELIVERY' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Clock className="w-5 h-5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
                  )}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wide">
                      {statusLabel}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {statusData.status === 'READY_FOR_DELIVERY'
                        ? 'The workshop has marked this vehicle ready for delivery.'
                        : statusData.status === 'INTAKE'
                          ? 'The workshop has recorded this vehicle as received.'
                          : `Current assigned bay: ${bayTitle}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Details returned from the public job-card status endpoint */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Car className="w-4 h-4 text-sky-400" />
                Job Card Details
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Job card</span>
                  <span className="font-mono font-semibold text-white">{statusData.job_card_number}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Current status</span>
                  <span className="font-semibold text-white">{statusLabel}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Assigned bay</span>
                  <span className="text-right text-white">{bayTitle}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Departments</span>
                  <span className="text-right text-white">
                    {statusData.departments?.length
                      ? statusData.departments.join(', ')
                      : 'Not specified on the job card'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-400">Last workshop update</span>
                  <span className="text-right text-white">{formatUpdatedAt(statusData.updated_at)}</span>
                </div>
              </div>
            </div>

            {/* Privacy Compliance Note */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 text-[10px] text-slate-500 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                Protected View: Customer personal contact information and internal financial ledgers are withheld in public tracking.
              </span>
            </div>
          </div>
        )}

        {/* Customer Lounge Amenities Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 shadow-xl space-y-3">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
            <Coffee className="w-4 h-4 text-amber-400" />
            Executive Lounge Amenities
          </h3>
          <p className="text-xs text-slate-400">
            While your vehicle is in service, relax in our 60" TV lounge with complimentary amenities:
          </p>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <Wifi className="w-4 h-4 text-sky-400" />
              <div>
                <div className="font-semibold text-white">Guest High-Speed Wi-Fi</div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Ask the service advisor for guest Wi-Fi details.
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-950 border border-slate-800">
              <Coffee className="w-4 h-4 text-amber-400" />
              <div>
                <div className="font-semibold text-white">Espresso & Cold Beverages</div>
                <div className="text-[10px] text-slate-400">
                  Fresh Italian roast coffee, tea, and chilled drinks.
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <a
              href="https://wa.me/923441411123?text=Hello%20Al%20Shaheen%20Auto%20Hub,%20I%20am%20inquiring%20about%20my%20vehicle%20service."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/40"
            >
              <MessageCircle className="w-4 h-4" />
              Chat with Service Advisor on WhatsApp
            </a>
          </div>
        </div>

        {/* Footer Info */}
        <div className="text-center text-[10px] text-slate-500 space-y-1">
          <p>Al Shaheen Auto Hub • Main Bedian Road, DHA Phase 6, Lahore</p>
          <p>Helpline: +92 344-1411123 • 9:00 AM – 9:00 PM</p>
        </div>
      </main>
    </div>
  );
}
