import type { JobCard } from '@/types';

type JobCardPrintIdentity = Pick<JobCard, 'id' | 'job_card_number' | 'customer_name' | 'plate_number'>;

function safeFilenamePart(value: string | undefined): string {
  return (value || '')
    .normalize('NFKC')
    .trim()
    .replace(/[\u0000-\u001f<>:"\/\\|?*]/g, '-')
    .replace(/\s+/g, '_')
    .replace(/[-_]{2,}/g, '_')
    .replace(/^[._ -]+|[._ -]+$/g, '')
    .slice(0, 40);
}

export function getJobCardPrintTitle(card: JobCardPrintIdentity): string {
  const identity = [card.customer_name, card.plate_number]
    .map((value) => safeFilenamePart(value))
    .filter(Boolean)
    .join('_');
  const fallback = safeFilenamePart(card.job_card_number || card.id) || 'New';

  return `JobCard_${identity || fallback}`;
}
