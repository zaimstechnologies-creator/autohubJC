export function getSupabaseJobCardsErrorMessage(error: { message: string }): string {
  const message = error.message || 'Unknown Supabase error.';

  if (
    /could not find the table.*public\.job_cards|relation ["']?public\.job_cards["']? does not exist/i.test(
      message
    )
  ) {
    return 'The public.job_cards table is missing. Run supabase/schema.sql in the Supabase project configured for this app.';
  }

  if (/\b522\b|cloudflare|connection timed out/i.test(message)) {
    return 'Supabase is temporarily unreachable (Cloudflare 522). Check the Supabase project status and try again.';
  }

  const detail = message.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240);
  return `Supabase database request failed: ${detail || 'Unknown error.'}`;
}
