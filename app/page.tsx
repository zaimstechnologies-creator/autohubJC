import Link from 'next/link';
import {
  Wrench,
  Tv,
  Smartphone,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  Car,
} from 'lucide-react';
import AuthSessionButton from '@/components/AuthSessionButton';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#070b14] via-[#0B1221] to-[#070b14] text-white flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="px-6 py-4 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-y-3">
        <div className="flex items-center gap-3">
          <div className="bg-white p-1 rounded-xl shadow-lg border border-slate-700/50 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              className="h-10 w-auto object-contain"
            />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white uppercase">
              Al Shaheen Auto Hub
            </h1>
            <p className="text-[11px] text-slate-400">
              Main Bedian Road, Near Askari 11, DHA Phase 6, Lahore
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            12 Bays Online
          </span>
          <AuthSessionButton />
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-12 flex-1 flex flex-col justify-center space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Next-Gen Automotive Operating System
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white uppercase">
            Precision Workshop, AI Diagnostics & Lounge Broadcast
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Integrated workshop orchestration across 12 bays, bilingual Urdu/English speech-to-text intake, free-tier Gemini structured mechanical diagnostics, and automated 60" lounge TV audio ducking.
          </p>
        </div>

        {/* 3 Main Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: /workshop */}
          <Link
            href="/workshop"
            className="group p-6 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 hover:scale-[1.02]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition">
                <Wrench className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider">
                  Internal Portal
                </span>
                <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition">
                  Workshop Management
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                12-Bay Matrix orchestration (6 Workshop + 6 Car Wash), concurrency mutex locks, digital job card registry, and A4 printing.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition">
              <span>Open Operations Portal</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 2: /tv */}
          <Link
            href="/tv"
            className="group p-6 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/50 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 hover:scale-[1.02]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-slate-950 transition">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-sky-400 uppercase tracking-wider">
                  Customer Lounge
                </span>
                <h3 className="text-lg font-bold text-white group-hover:text-sky-400 transition">
                  60" Waiting Lounge TV
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Official YouTube channel broadcast with automated volume ducking, Web Audio chimes, and FIFO delivery voice announcements.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400 group-hover:translate-x-1 transition">
              <span>Launch Lounge Display</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>

          {/* Card 3: /track */}
          <Link
            href="/track"
            className="group p-6 rounded-2xl bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-emerald-500/50 shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 hover:scale-[1.02]"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-slate-950 transition">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                  Vehicle Tracking
                </span>
                <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition">
                  Customer Vehicle Track
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Privacy-first registration plate lookup with 4-stage live progression, bay sensor telemetry, and direct WhatsApp advisor contact.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition">
              <span>Track My Vehicle</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-slate-800 text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Multilingual Urdu Voice Intake</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
            <span>AI Diagnostics</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>YouTube Ducking & Speech FIFO</span>
          </div>
          <div className="flex items-center gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Strict Privacy-Guaranteed RPC</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
        Al Shaheen Auto Hub • Lahore, Pakistan • Powered by Next.js, Supabase & Google Gemini API
      </footer>
    </div>
  );
}
