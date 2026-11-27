'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { JobCard } from '@/types';
import { getJobCardPrintTitle } from '@/lib/jobCardPrintName';
import JobCardForm from '@/components/JobCardForm';
import PrintJobCardA4 from '@/components/PrintJobCardA4';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function JobCardDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;

  const [card, setCard] = useState<JobCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const autoPrintJobId = useRef<string | null>(null);
  const originalDocumentTitle = useRef<string | null>(null);

  useEffect(() => {
    const handleAfterPrint = () => {
      setIsPrintMode(false);
      if (originalDocumentTitle.current !== null) {
        document.title = originalDocumentTitle.current;
        originalDocumentTitle.current = null;
      }
    };
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
            setTimeout(() => printAfterRender(json.data), 500);
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

  const handlePrint = (jobCard?: JobCard) => {
    const cardToPrint = jobCard || card;
    if (!cardToPrint) return;
    setIsPrintMode(true);
    setCard(cardToPrint);
    setTimeout(() => printAfterRender(cardToPrint), 300);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b14] dark:text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin text-amber-500 dark:text-amber-400" />
          Loading Job Card {id}...
        </div>
      </div>
    );
  }

  function printAfterRender(jobCard: JobCard) {
    if (originalDocumentTitle.current === null) {
      originalDocumentTitle.current = document.title;
    }
    document.title = getJobCardPrintTitle(jobCard);

    void document.fonts.ready.then(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => window.print());
      });
    });
  }

  if (!card) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b14] dark:text-slate-100 flex flex-col items-center justify-center p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Job Card Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">The requested record ({id}) could not be located.</p>
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-[#070b14] dark:text-slate-100">
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
