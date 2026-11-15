'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import JobCardForm from '@/components/JobCardForm';
import { JobCard } from '@/types';
import { Loader2 } from 'lucide-react';

function NewJobCardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const categoryParam = searchParams.get('category');
  const bayParam = searchParams.get('bay');

  const initialData: Partial<JobCard> = {
    bay_category: categoryParam === 'CAR_WASH' ? 'CAR_WASH' : 'WORKSHOP',
    bay_number: bayParam ? parseInt(bayParam, 10) : 1,
  };

  const handleSaved = (saved: JobCard) => {
    router.push(`/workshop/job-card/${saved.id}`);
  };

  return (
    <JobCardForm
      initialData={initialData as any}
      onSaveSuccess={handleSaved}
    />
  );
}

export default function NewJobCardPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 p-6">
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
