import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseServerConfigured, supabaseServer } from '@/lib/supabaseServerClient';
import { getLocalJobCards, saveLocalJobCards, normalizeJobCard } from '@/lib/dataStore';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  // If Supabase is configured, try querying Supabase first
  if (isSupabaseServerConfigured && supabaseServer) {
    try {
      if (id) {
        const { data, error } = await supabaseServer
          .from('job_cards')
          .select('*')
          .or(`id.eq.${id},job_card_number.eq.${id}`)
          .single();
        if (!error && data) {
          return NextResponse.json({ success: true, data: normalizeJobCard(data) });
        }
      } else {
        const { data, error } = await supabaseServer
          .from('job_cards')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return NextResponse.json({ success: true, data: data.map(normalizeJobCard) });
        }
      }
    } catch (err) {
      console.warn('Supabase GET failed, falling back to local store:', err);
    }
  }

  // Safe fallback (In-memory + Writable tmp / seed)
  const allCards = getLocalJobCards();
  if (id) {
    const card = allCards.find(c => c.id === id || c.job_card_number === id);
    if (!card) {
      return NextResponse.json({ error: 'Job card not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: card });
  }

  return NextResponse.json({ success: true, data: allCards });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const newId = body.id || `ASH-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date().toISOString();

    const normalized = normalizeJobCard({
      ...body,
      id: newId,
      job_card_number: body.job_card_number || newId,
      created_at: body.created_at || now,
      updated_at: now,
    });

    // Save to Supabase if configured
    if (isSupabaseServerConfigured && supabaseServer) {
      try {
        await supabaseServer.from('job_cards').insert([normalized]);
      } catch (err) {
        console.warn('Supabase POST insert failed:', err);
      }
    }

    // Always update local storage safely
    const cards = [...getLocalJobCards()];
    const existingIdx = cards.findIndex(c => c.id === normalized.id || c.job_card_number === normalized.job_card_number);
    if (existingIdx >= 0) {
      cards[existingIdx] = normalized;
    } else {
      cards.unshift(normalized);
    }
    saveLocalJobCards(cards);

    return NextResponse.json({ success: true, data: normalized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save job card' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id && !body.job_card_number) {
      return NextResponse.json({ error: 'Missing card identifier' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const normalized = normalizeJobCard({
      ...body,
      updated_at: now,
      ...(body.status === 'CLOSED_PAID' && !body.closed_at ? { closed_at: now } : {}),
    });

    if (isSupabaseServerConfigured && supabaseServer) {
      try {
        await supabaseServer
          .from('job_cards')
          .update(normalized)
          .eq('id', normalized.id);
      } catch (err) {
        console.warn('Supabase PUT update failed:', err);
      }
    }

    const cards = [...getLocalJobCards()];
    const existingIdx = cards.findIndex(c => c.id === normalized.id || c.job_card_number === normalized.job_card_number);
    if (existingIdx >= 0) {
      cards[existingIdx] = normalized;
    } else {
      cards.unshift(normalized);
    }
    saveLocalJobCards(cards);

    return NextResponse.json({ success: true, data: normalized });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update job card' }, { status: 500 });
  }
}
