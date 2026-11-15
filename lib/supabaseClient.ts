import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { JobCard, AppSettings, PublicVehicleStatus } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('http') && 
  !supabaseUrl.includes('your-supabase-project')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

// Database helper functions with automatic fallback
export async function fetchJobCards(): Promise<JobCard[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('job_cards')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        return data as JobCard[];
      }
      console.warn('Supabase fetch error, using API fallback:', error?.message);
    } catch (err) {
      console.warn('Supabase fetch exception, using API fallback:', err);
    }
  }

  // Fallback to local server API
  try {
    const res = await fetch('/api/jobcards', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (err) {
    console.error('Failed to fetch from /api/jobcards:', err);
  }

  return [];
}

export async function fetchJobCardById(id: string): Promise<JobCard | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('job_cards')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        return data as JobCard;
      }
    } catch (err) {
      console.warn('Supabase fetchById error:', err);
    }
  }

  try {
    const res = await fetch(`/api/jobcards?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      return json.data || null;
    }
  } catch (err) {
    console.error('Failed to fetch job card by ID:', err);
  }

  return null;
}

export async function saveJobCard(jobCard: Partial<JobCard> & { plate_number: string }): Promise<{ data: JobCard | null; error: string | null }> {
  // Always update updated_at
  const payload = {
    ...jobCard,
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      if (jobCard.id) {
        // Optimistic concurrency check: if updated_at provided, include it in WHERE or proceed with update
        const { data, error } = await supabase
          .from('job_cards')
          .update(payload)
          .eq('id', jobCard.id)
          .select()
          .single();

        if (error) throw error;
        return { data: data as JobCard, error: null };
      } else {
        const { data, error } = await supabase
          .from('job_cards')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        return { data: data as JobCard, error: null };
      }
    } catch (err: any) {
      console.warn('Supabase save error, persisting via API:', err?.message || err);
    }
  }

  // Fallback to internal API
  try {
    const res = await fetch('/api/jobcards', {
      method: jobCard.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to save job card');
    return { data: result.data, error: null };
  } catch (err: any) {
    return { data: null, error: err.message || 'Unknown save error' };
  }
}

export async function updateJobCardBayAndStatus(
  id: string,
  bay_category: 'WORKSHOP' | 'CAR_WASH',
  bay_number: number,
  status: JobCard['status'],
  lastUpdatedAt?: string
): Promise<{ success: boolean; error?: string }> {
  if (isSupabaseConfigured && supabase) {
    try {
      let query = supabase
        .from('job_cards')
        .update({
          bay_category,
          bay_number,
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'CLOSED_PAID' ? { closed_at: new Date().toISOString() } : {}),
        })
        .eq('id', id);

      // Mutex optimistic lock check if lastUpdatedAt is specified
      if (lastUpdatedAt) {
        query = query.eq('updated_at', lastUpdatedAt);
      }

      const { data, error } = await query.select();
      if (error) throw error;
      if (lastUpdatedAt && (!data || data.length === 0)) {
        return { success: false, error: 'Record was updated by another user. Refreshing...' };
      }
      return { success: true };
    } catch (err: any) {
      console.warn('Supabase update status error:', err);
    }
  }

  // Fallback to API
  try {
    const res = await fetch('/api/jobcards/status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, bay_category, bay_number, status, lastUpdatedAt }),
    });
    const result = await res.json();
    if (!res.ok) {
      return { success: false, error: result.error || 'Failed to update bay/status' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchPublicVehicleStatus(plate: string): Promise<PublicVehicleStatus | null> {
  const cleanPlate = plate.toUpperCase().replace(/\s+/g, '');
  if (!cleanPlate) return null;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc('get_public_vehicle_status', {
        p_plate: cleanPlate,
      });

      if (!error && data && data.length > 0) {
        return data[0] as PublicVehicleStatus;
      }
      // If RPC is missing in development, try direct secure select limited to safe fields
      const { data: directData, error: directErr } = await supabase
        .from('job_cards')
        .select('job_card_number, plate_number, make_model, variant, bay_category, bay_number, status, departments, updated_at, created_at')
        .ilike('plate_number', `%${cleanPlate}%`)
        .neq('status', 'CLOSED_PAID')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!directErr && directData && directData.length > 0) {
        return directData[0] as PublicVehicleStatus;
      }
    } catch (err) {
      console.warn('Supabase public lookup exception:', err);
    }
  }

  // Fallback to API endpoint
  try {
    const res = await fetch(`/api/track?plate=${encodeURIComponent(cleanPlate)}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      return json.data || null;
    }
  } catch (err) {
    console.error('Failed to query public tracking:', err);
  }

  return null;
}
