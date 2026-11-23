import { NextResponse } from 'next/server';
import { getLocalJobCards } from '@/lib/dataStore';
import { isSupabaseServerConfigured, supabaseServer } from '@/lib/supabaseServerClient';
import type { JobCard } from '@/types';

type LoungeJobCard = Pick<
  JobCard,
  | 'id'
  | 'make_model'
  | 'plate_number'
  | 'variant'
  | 'bay_category'
  | 'bay_number'
  | 'status'
  | 'departments'
  | 'updated_at'
>;

export const dynamic = 'force-dynamic';

function toLoungeCard(card: Partial<JobCard>): LoungeJobCard {
  const bayCategory = card.bay_category === 'CAR_WASH' ? 'CAR_WASH' : 'WORKSHOP';
  const bayNumber = Number(card.bay_number || 1);
  const updatedAt = String(card.updated_at || 'unknown');

  return {
    id: String(card.id || card.job_card_number || `${bayCategory}-${bayNumber}-${updatedAt}`),
    make_model: String(card.make_model || 'Vehicle'),
    plate_number: String(card.plate_number || ''),
    variant: String(card.variant || ''),
    bay_category: bayCategory,
    bay_number: bayNumber,
    status: card.status || 'IN_PROGRESS',
    departments: Array.isArray(card.departments) ? card.departments.slice(0, 2) : [],
    updated_at: updatedAt,
  };
}

export async function GET() {
  if (isSupabaseServerConfigured && supabaseServer) {
    const { data, error } = await supabaseServer
      .from('job_cards')
      .select(
        'id, job_card_number, make_model, plate_number, variant, bay_category, bay_number, status, departments, updated_at'
      )
      .neq('status', 'CLOSED_PAID')
      .order('updated_at', { ascending: false });

    if (!error && data) {
      return NextResponse.json(
        { success: true, data: data.map((card) => toLoungeCard(card)) },
        { headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.warn('Supabase TV queue query failed:', error?.message);
  }

  const cards = getLocalJobCards()
    .filter((card) => card.status !== 'CLOSED_PAID')
    .map((card) => toLoungeCard(card));

  return NextResponse.json(
    { success: true, data: cards },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
