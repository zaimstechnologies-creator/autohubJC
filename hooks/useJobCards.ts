'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import type { JobCard } from '@/types';

const POLL_INTERVAL_MS = 8_000;
const MAX_RETRY_DELAY_MS = 60_000;

export function useJobCards() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const loadErrorShownRef = useRef(false);
  const loadFailureCountRef = useRef(0);

  const loadJobCards = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/jobcards', { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load job cards.');
      if (!Array.isArray(result.data)) throw new Error('Job-card response was invalid.');

      setJobCards(result.data);
      loadErrorShownRef.current = false;
      loadFailureCountRef.current = 0;
      return true;
    } catch (error) {
      console.error('Failed to load cards:', error);
      loadFailureCountRef.current += 1;
      if (!loadErrorShownRef.current) {
        toast.error(error instanceof Error ? error.message : 'Failed to load job cards.');
        loadErrorShownRef.current = true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;

    const poll = async () => {
      const loaded = await loadJobCards();
      if (cancelled) return;

      const retryDelay = loaded
        ? POLL_INTERVAL_MS
        : Math.min(
            MAX_RETRY_DELAY_MS,
            POLL_INTERVAL_MS * 2 ** Math.min(loadFailureCountRef.current, 3)
          );
      timer = setTimeout(poll, retryDelay);
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return { jobCards, loading, loadJobCards };
}
