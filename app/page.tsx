import Link from 'next/link';
import {
  Wrench,
  Tv,
  Smartphone,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-[#070b14] via-[#0B1221] to-[#070b14] font-sans text-white">
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <div className="flex shrink-0 items-center justify-center rounded-xl border border-slate-700/50 bg-white p-1 shadow-lg">
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              className="h-9 w-auto object-contain sm:h-10"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold uppercase tracking-tight text-white sm:text-base">
              Al Shaheen Auto Hub
            </h1>
            <p className="text-[10px] leading-snug text-slate-400 sm:text-[11px]">
              Main Bedian Road, Near Askari 11, DHA Phase 6, Lahore
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-emerald-400 sm:text-xs">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <span className="whitespace-nowrap">
            12 Bays Online
          </span>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-9 px-4 py-10 sm:gap-11 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-5xl space-y-4 text-center sm:space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-[11px] font-semibold text-amber-300 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Next-Gen Automotive Operating System
          </div>
          <h2 className="text-3xl font-black uppercase leading-[1.08] tracking-tight text-white sm:text-4xl lg:text-5xl">
            Connected workshop care.
            <span className="mt-1 block text-white">
              Clear from intake to delivery.
            </span>
          </h2>
          <p className="mx-auto max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
            Workshop operations, AI-assisted diagnostics, customer vehicle tracking, and a more welcoming lounge experience — together in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 sm:gap-5">
          <Link
            href="/workshop"
            className="group relative flex min-h-[250px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-amber-500/50 hover:bg-slate-900 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:p-6"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 transition group-hover:bg-amber-500 group-hover:text-slate-950">
                  <Wrench className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] tracking-wide text-slate-600">01 / OPERATIONS</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-400">
                  Workshop team
                </span>
                <h3 className="mt-1 text-xl font-bold leading-snug text-white transition group-hover:text-amber-400 sm:text-2xl">
                  Workshop Management
                </h3>
              </div>
              <p className="text-sm leading-7 text-slate-400 sm:text-base">
                Manage workshop and wash bays, job cards, vehicle status, and service records.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-amber-400 transition">
              <span>Open workshop</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/tv"
            className="group relative flex min-h-[250px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-sky-500/50 hover:bg-slate-900 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 sm:p-6"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400 transition group-hover:bg-sky-500 group-hover:text-slate-950">
                  <Tv className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] tracking-wide text-slate-600">02 / CUSTOMER LOUNGE</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-sky-400">
                  Customer lounge
                </span>
                <h3 className="mt-1 text-xl font-bold leading-snug text-white transition group-hover:text-sky-400 sm:text-2xl">
                  Lounge TV
                </h3>
              </div>
              <p className="text-sm leading-7 text-slate-400 sm:text-base">
                A calm waiting-room display with service updates and delivery announcements.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-sky-400 transition">
              <span>Open lounge display</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/track"
            className="group relative flex min-h-[250px] min-w-0 flex-col justify-between overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:bg-slate-900 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 sm:p-6 md:col-span-2 xl:col-span-1"
          >
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 transition group-hover:bg-emerald-500 group-hover:text-slate-950">
                  <Smartphone className="h-5 w-5" />
                </div>
                <span className="font-mono text-[10px] tracking-wide text-slate-600">03 / VEHICLE CARE</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
                  Customer service
                </span>
                <h3 className="mt-1 text-xl font-bold leading-snug text-white transition group-hover:text-emerald-400 sm:text-2xl">
                  Track your vehicle
                </h3>
              </div>
              <p className="text-sm leading-7 text-slate-400 sm:text-base">
                Check your service progress and contact an advisor when you need help.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-2 text-sm font-bold text-emerald-400 transition">
              <span>Track a vehicle</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-y-3 border-y border-slate-800/80 py-4 text-xs sm:grid-cols-2 sm:gap-y-4 sm:py-5 sm:text-sm xl:grid-cols-4 xl:gap-y-0">
          <div className="flex min-h-10 min-w-0 items-center gap-2.5 text-slate-300 sm:justify-center sm:px-3 xl:border-r xl:border-slate-800/80">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="leading-snug">Multilingual Urdu Voice Intake</span>
          </div>
          <div className="flex min-h-10 min-w-0 items-center gap-2.5 text-slate-300 sm:justify-center sm:px-3 xl:border-r xl:border-slate-800/80">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-purple-400" />
            <span className="leading-snug">AI Diagnostics</span>
          </div>
          <div className="flex min-h-10 min-w-0 items-center gap-2.5 text-slate-300 sm:justify-center sm:px-3 xl:border-r xl:border-slate-800/80">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-400" />
            <span className="leading-snug">YouTube Ducking & Speech FIFO</span>
          </div>
          <div className="flex min-h-10 min-w-0 items-center gap-2.5 text-slate-300 sm:justify-center sm:px-3">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span className="leading-snug">Strict Privacy-Guaranteed RPC</span>
          </div>
        </div>
      </main>

      <footer className="relative border-t border-slate-800/80 px-4 py-4 text-center text-[11px] text-slate-500 sm:px-6">
        Al Shaheen Auto Hub • Main Bedian Road, Near Askari 11, DHA Phase 6, Lahore, Pakistan
      </footer>
    </div>
  );
}
