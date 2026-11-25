import type { ItemizedPart, JobCard } from '@/types';

type FinancialInputs = Pick<
  JobCard,
  'labor_charges' | 'alignment_charges' | 'discount_amount' | 'advance_deposit'
> & {
  itemized_parts?: ItemizedPart[];
};

export function calculateJobCardFinancials({
  itemized_parts = [],
  labor_charges,
  alignment_charges,
  discount_amount,
  advance_deposit,
}: FinancialInputs) {
  const parts_total = itemized_parts.reduce((sum, part) => sum + (Number(part.amount) || 0), 0);
  const net_payable =
    parts_total +
    Number(labor_charges || 0) +
    Number(alignment_charges || 0) -
    Number(discount_amount || 0);
  const balance_remaining = Math.max(0, net_payable - Number(advance_deposit || 0));

  return { parts_total, net_payable, balance_remaining };
}
