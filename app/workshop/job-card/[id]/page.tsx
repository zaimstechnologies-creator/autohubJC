'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { JobCard } from '@/types';
import JobCardForm from '@/components/JobCardForm';
import PrintJobCardA4 from '@/components/PrintJobCardA4';
import { Printer, ArrowLeft, Edit3, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function JobCardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const [card, setCard] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const autoPrintJobId = useRef<string | null>(null);

  useEffect(() => {
    const handleAfterPrint = () => setIsPrintMode(false);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  useEffect(() => {
    if (!id) return;

    const fetchCard = async () => {
      try {
        const res = await fetch(`/api/jobcards?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          setCard(json.data);
          if (searchParams.get('print') === '1' && autoPrintJobId.current !== id) {
            autoPrintJobId.current = id;
            setIsPrintMode(true);
            setTimeout(() => printAfterRender(), 500);
          }
        }
      } catch (err) {
        console.error('Error fetching job card:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCard();
  }, [id]);

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => printAfterRender(), 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
          Loading Job Card {id}...
        </div>
      </div>
    );
  }

  function printAfterRender() {
    void document.fonts.ready.then(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => window.print());
      });
    });
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Job Card Not Found</h2>
        <p className="text-sm text-slate-400">The requested record ({id}) could not be located.</p>
        <Link
          href="/workshop"
          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
        >
          Return to Workshop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100">
      {/* Floating print control when in screen mode */}
      <div className="print:hidden p-4 max-w-7xl mx-auto flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            href="/workshop"
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="text-xs font-mono font-bold text-amber-400">
            {card.job_card_number}
          </span>
          <span className="text-xs text-slate-400">
            {card.make_model} ({card.plate_number})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPrintMode ? (
            <button
              type="button"
              onClick={() => setIsPrintMode(false)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5"
            >
              <Edit3 className="w-4 h-4 text-amber-400" />
              Edit Form Mode
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow"
            >
              <Printer className="w-4 h-4" />
              Print Certified A4
            </button>
          )}
        </div>
      </div>

      <div className="p-6 print-page-stage">
        {isPrintMode ? (
          <div className="print-page-frame bg-white shadow-2xl mx-auto print:shadow-none">
            <PrintJobCardA4 card={card} />
          </div>
        ) : (
          <JobCardForm
            initialData={card}
            onSaveSuccess={(updated) => setCard(updated)}
            onPrint={handlePrint}
          />
        )}
      </div>
    </div>
  );
}
