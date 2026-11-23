'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import JobCardForm from '@/components/JobCardForm';
import { JobCard } from '@/types';
import { getJobCardPrintTitle } from '@/lib/jobCardPrintName';
import { Loader2 } from 'lucide-react';
import PrintJobCardA4 from '@/components/PrintJobCardA4';
import AuthSessionButton from '@/components/AuthSessionButton';

function NewJobCardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [printCard, setPrintCard] = useState<JobCard | null>(null);
  const printStartedFor = useRef<string | null>(null);
  const originalDocumentTitle = useRef<string | null>(null);

  const categoryParam = searchParams.get('category');
  const bayParam = searchParams.get('bay');

  const initialData: Partial<JobCard> = {
    bay_category: categoryParam === 'CAR_WASH' ? 'CAR_WASH' : 'WORKSHOP',
    bay_number: bayParam ? parseInt(bayParam, 10) : 1,
  };

  const handleSaved = (saved: JobCard) => {
    router.push(`/workshop/job-card/${saved.id}`);
  };

  const handlePrint = (saved: JobCard) => {
    setPrintCard(saved);
  };

  useEffect(() => {
    if (!printCard || printStartedFor.current === printCard.id) return;

    printStartedFor.current = printCard.id;
    if (originalDocumentTitle.current === null) {
      originalDocumentTitle.current = document.title;
    }
    document.title = getJobCardPrintTitle(printCard);
    setTimeout(() => {
      void document.fonts.ready.then(() => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => window.print());
        });
      });
    }, 300);
  }, [printCard]);

  useEffect(() => {
    const handleAfterPrint = () => {
      setPrintCard(null);
      printStartedFor.current = null;
      if (originalDocumentTitle.current !== null) {
        document.title = originalDocumentTitle.current;
        originalDocumentTitle.current = null;
      }
    };
    window.addEventListener('afterprint', handleAfterPrint);
    return () => window.removeEventListener('afterprint', handleAfterPrint);
  }, []);

  return (
    <>
      <div className={printCard ? 'hidden print:hidden' : 'mb-4 flex justify-end print:hidden'}>
        <AuthSessionButton />
      </div>
      <div className={printCard ? 'hidden print:hidden' : ''}>
        <JobCardForm
          initialData={initialData as any}
          onSaveSuccess={handleSaved}
          onPrint={handlePrint}
        />
      </div>
      {printCard && (
        <div className="print-page-frame bg-white shadow-2xl mx-auto print:shadow-none">
          <PrintJobCardA4 card={printCard} />
        </div>
      )}
    </>
  );
}

export default function NewJobCardPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6 print-page-stage">
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[50vh] text-slate-400 font-mono text-sm gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            Initializing Job Card...
          </div>
        }
      >
        <NewJobCardContent />
      </Suspense>
    </div>
  );
}
