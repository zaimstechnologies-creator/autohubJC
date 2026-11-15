import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { getLocalJobCards, saveLocalJobCards } from '@/lib/dataStore';

export async function PATCH(req: NextRequest) {
  try {
    const { id, bay_category, bay_number, status, lastUpdatedAt } = await req.json();

    if (!id) {
      return NextResponse.json({ error: 'Missing job card ID' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Optimistic concurrency locking in Supabase: check if lastUpdatedAt is specified
    if (isSupabaseConfigured && supabase) {
      try {
        let query = supabase
          .from('job_cards')
          .update({
            bay_category,
            bay_number,
            status,
            updated_at: now,
            ...(status === 'CLOSED_PAID' ? { closed_at: now } : {}),
          })
          .eq('id', id);

        if (lastUpdatedAt) {
          query = query.eq('updated_at', lastUpdatedAt);
        }

        const { data, error } = await query.select();
        if (error) {
          console.warn('Supabase status update error:', error);
        } else if (lastUpdatedAt && (!data || data.length === 0)) {
          return NextResponse.json(
            { error: 'Conflict: This job card was just updated by another advisor. Reloading latest state.' },
            { status: 409 }
          );
        }
      } catch (err) {
        console.warn('Supabase status update exception:', err);
      }
    }

    // Update local data safely (In-memory + Writable tmp / seed)
    const cards = [...getLocalJobCards()];
    const cardIndex = cards.findIndex((c: any) => c.id === id || c.job_card_number === id);
    if (cardIndex === -1) {
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }

    const targetCard = { ...cards[cardIndex] };

    // Optimistic lock check on local record
    if (lastUpdatedAt && targetCard.updated_at && targetCard.updated_at !== lastUpdatedAt) {
      console.warn(`Local lock conflict: target=${targetCard.updated_at}, received=${lastUpdatedAt}`);
    }

    targetCard.bay_category = bay_category ?? targetCard.bay_category ?? 'WORKSHOP';
    targetCard.bay_number = bay_number ?? targetCard.bay_number ?? 1;
    targetCard.status = status ?? targetCard.status;
    targetCard.updated_at = now;
    if (status === 'CLOSED_PAID') {
      targetCard.closed_at = now;
    }

    cards[cardIndex] = targetCard;
    saveLocalJobCards(cards);

    return NextResponse.json({ success: true, data: targetCard });
  } catch (err: any) {
    console.error('Error in status PATCH route:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
