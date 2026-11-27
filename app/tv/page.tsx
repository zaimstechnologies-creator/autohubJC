'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { JobCard, WORKSHOP_BAYS, CAR_WASH_BAYS } from '@/types';
import LoungeAudioEngine, { YOUTUBE_DEFAULT_VOLUME } from '@/components/LoungeAudioEngine';
import {
  Radio,
  Activity,
  CheckCircle2,
  Clock,
  Car,
} from 'lucide-react';

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

const ANNOUNCEMENT_STATE_KEY = 'tv-announcement-state-v2';

interface AnnouncementState {
  pendingIds: string[];
  completedIds: string[];
}

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export default function LoungeTVPage() {
  const [jobCards, setJobCards] = useState<LoungeJobCard[]>([]);
  const [announcementQueue, setAnnouncementQueue] = useState<LoungeJobCard[]>([]);
  const [announcingCardId, setAnnouncingCardId] = useState<string | null>(null);
  const [playlistId, setPlaylistId] = useState(
    process.env.NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID || 'PLfWI-z1AjtsA'
  );
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [queueStatus, setQueueStatus] = useState<'loading' | 'live' | 'error'>('loading');

  const playerRef = useRef<any>(null);
  const queueListRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const queueScrollDirectionRef = useRef<1 | -1>(1);
  const announcementStateRef = useRef<AnnouncementState>({
    pendingIds: [],
    completedIds: [],
  });

  const saveAnnouncementState = (state: AnnouncementState) => {
    announcementStateRef.current = state;
    try {
      localStorage.setItem(ANNOUNCEMENT_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Could not persist TV announcement queue:', error);
    }
  };

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(ANNOUNCEMENT_STATE_KEY) || 'null');
      if (
        stored &&
        Array.isArray(stored.pendingIds) &&
        Array.isArray(stored.completedIds)
      ) {
        announcementStateRef.current = {
          pendingIds: stored.pendingIds.filter((id: unknown): id is string => typeof id === 'string'),
          completedIds: stored.completedIds.filter((id: unknown): id is string => typeof id === 'string'),
        };
      }
    } catch (error) {
      console.warn('Could not restore TV announcement queue:', error);
    }
  }, []);

  // Live Clock updater
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unlockAudio = () => {
      try {
        if (playerRef.current) {
          if (typeof playerRef.current.setLoop === 'function') playerRef.current.setLoop(true);
          if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
          if (typeof playerRef.current.setVolume === 'function') {
            playerRef.current.setVolume(YOUTUBE_DEFAULT_VOLUME);
          }
          if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
        }
      } catch (err) {
        console.warn('Automatic audio unlock error:', err);
      }

      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    // Keep these listeners until a real user action unlocks browser audio.
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Fetch job cards
  const fetchCards = async () => {
    try {
      const res = await fetch('/api/tv/queue', { cache: 'no-store' });
      if (!res.ok) throw new Error(`Queue request failed (${res.status}).`);

      const json = await res.json();
      if (!Array.isArray(json.data)) throw new Error('Queue response was invalid.');

      const cards: LoungeJobCard[] = json.data;
      setJobCards(cards);
      setQueueStatus('live');

      const readyVehicles = cards.filter((c) => c.status === 'READY_FOR_DELIVERY');
      const readyIds = new Set(readyVehicles.map((c) => c.id));
      const currentState = announcementStateRef.current;
      let pendingIds = currentState.pendingIds.filter((id) => readyIds.has(id));
      let completedIds = currentState.completedIds.filter((id) => readyIds.has(id));

      const newlyReadyIds = readyVehicles
        .filter((card) => !pendingIds.includes(card.id) && !completedIds.includes(card.id))
        .map((card) => card.id);

      if (readyVehicles.length === 0) {
        pendingIds = [];
        completedIds = [];
      } else if (pendingIds.length === 0) {
        if (newlyReadyIds.length > 0) {
          pendingIds = newlyReadyIds;
        }
      } else {
        const cycleIds = new Set([...pendingIds, ...completedIds]);
        pendingIds = [
          ...pendingIds,
          ...readyVehicles
            .filter((card) => !cycleIds.has(card.id))
            .map((card) => card.id),
        ];
      }

      const nextState = { pendingIds, completedIds };
      if (JSON.stringify(nextState) !== JSON.stringify(currentState)) {
        saveAnnouncementState(nextState);
      }

      const readyById = new Map(readyVehicles.map((card) => [card.id, card]));
      setAnnouncementQueue(
        pendingIds
          .map((id) => readyById.get(id))
          .filter((card): card is LoungeJobCard => Boolean(card))
      );
    } catch (err) {
      console.error('TV queue fetch error:', err);
      setQueueStatus('error');
    }
  };

  useEffect(() => {
    void fetchCards();

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void fetchCards();
      }
    }, 2000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void fetchCards();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // YouTube IFrame Player API loader
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (window.YT && window.YT.Player) {
        try {
          playerRef.current = new window.YT.Player('youtube-player-container', {
            height: '100%',
            width: '100%',
            playerVars: {
              listType: 'playlist',
              list: playlistId,
              autoplay: 1,
              controls: 1,
              modestbranding: 1,
              rel: 0,
              playsinline: 1,
              enablejsapi: 1,
            },
            events: {
              onReady: (event: any) => {
                try {
                  // Crucial: setLoop(true) tells the player to loop the whole playlist across all videos
                  event.target.setLoop(true);
                  // Best-effort audible autoplay; Android kiosk browsers must allow it.
                  event.target.unMute();
                  event.target.setVolume(YOUTUBE_DEFAULT_VOLUME);
                  event.target.playVideo();
                } catch (e) {
                  console.warn('YouTube onReady setup error:', e);
                }
              },
              onStateChange: (event: any) => {
                // When a video finishes (event.data === 0 or YT.PlayerState.ENDED)
                if (event.data === 0) {
                  try {
                    const playlist = event.target.getPlaylist();
                    const currentIndex = event.target.getPlaylistIndex();
                    if (Array.isArray(playlist) && playlist.length > 0) {
                      if (currentIndex >= playlist.length - 1) {
                        // Reached the end of the full playlist -> restart from first video (index 0)
                        event.target.playVideoAt(0);
                      } else {
                        // Advance to the next video in the playlist
                        event.target.nextVideo();
                      }
                    } else {
                      event.target.nextVideo();
                    }
                  } catch (e) {
                    console.warn('Playlist advancement error:', e);
                    try {
                      event.target.playVideo();
                    } catch (_) {}
                  }
                }
              },
              onError: (event: any) => {
                console.warn('YouTube playback error on video, advancing to next in playlist:', event.data);
                try {
                  event.target.nextVideo();
                } catch (_) {}
              },
            },
          });
        } catch (e) {
          console.warn('YouTube Player init exception:', e);
        }
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      try {
        if (playerRef.current && playerRef.current.destroy) {
          playerRef.current.destroy();
        }
      } catch (_) {}
    };
  }, [playlistId]);

  const handleAnnouncementFinished = (cardId: string) => {
    setAnnouncingCardId((activeId) => (activeId === cardId ? null : activeId));
    setAnnouncementQueue((prev) => prev.filter((c) => c.id !== cardId));
    const currentState = announcementStateRef.current;
    const wasPending = currentState.pendingIds.includes(cardId);
    const pendingIds = currentState.pendingIds.filter((id) => id !== cardId);
    const completedIds = wasPending && !currentState.completedIds.includes(cardId)
      ? [...currentState.completedIds, cardId]
      : currentState.completedIds;
    saveAnnouncementState({
      pendingIds,
      completedIds,
    });
  };

  // Filter Active Vehicles in Workshop (Non-Closed)
  const displayQueue = useMemo(() => {
    return jobCards
      .filter((c) => c.status === 'READY_FOR_DELIVERY' || c.status === 'IN_PROGRESS' || c.status === 'INTAKE')
      .sort((a, b) => {
        // Ready vehicles first
        if (a.status === 'READY_FOR_DELIVERY' && b.status !== 'READY_FOR_DELIVERY') return -1;
        if (b.status === 'READY_FOR_DELIVERY' && a.status !== 'READY_FOR_DELIVERY') return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });
  }, [jobCards]);

  const readyCount = displayQueue.filter((card) => card.status === 'READY_FOR_DELIVERY').length;
  const inProgressCount = displayQueue.filter((card) => card.status === 'IN_PROGRESS').length;

  // Keep the lounge list moving at a gentle, TV-friendly pace. Announcements
  // temporarily take priority so the highlighted vehicle remains in view.
  useEffect(() => {
    const list = queueListRef.current;
    if (!list || announcingCardId) return;

    const interval = window.setInterval(() => {
      if (list.scrollHeight <= list.clientHeight) return;
      const maxScrollTop = list.scrollHeight - list.clientHeight;
      const currentTop = list.scrollTop;

      if (currentTop >= maxScrollTop - 1) queueScrollDirectionRef.current = -1;
      if (currentTop <= 1) queueScrollDirectionRef.current = 1;

      list.scrollTop = Math.max(
        0,
        Math.min(maxScrollTop, currentTop + queueScrollDirectionRef.current * 1.25)
      );
    }, 55);

    return () => window.clearInterval(interval);
  }, [announcingCardId, displayQueue.length]);

  useEffect(() => {
    if (!announcingCardId) return;
    cardRefs.current.get(announcingCardId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [announcingCardId, displayQueue]);

  return (
    <div className="tv-lounge flex h-dvh min-h-0 flex-col overflow-hidden bg-[#080e19] font-sans text-white selection:bg-amber-400/30">
      <header className="z-20 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-white/[0.08] bg-[#080e19] px-4 py-3 shadow-lg shadow-black/10 sm:px-6 md:min-h-[76px] md:flex-nowrap md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white p-1 shadow-sm sm:h-12 sm:w-[74px]">
            <img src="/logo.png" alt="Al Shaheen Auto Hub" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-sm font-black uppercase tracking-wide text-white sm:text-base">
                Al Shaheen Auto Hub
              </h1>
              <span className="rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-rose-200 sm:text-[10px]">
                Customer Lounge
              </span>
            </div>
            <p className="mt-1 truncate text-[10px] font-medium text-slate-400 sm:text-[11px]">
              Main Bedian Road, DHA Phase 6, Lahore
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <LoungeAudioEngine
            queue={announcementQueue}
            onAnnouncementStart={setAnnouncingCardId}
            onAnnouncementComplete={handleAnnouncementFinished}
            playerRef={playerRef}
          />
        </div>

        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:justify-end sm:gap-3">
          <div className="flex items-center gap-3 border-l border-white/10 pl-3 sm:pl-4">
            <div className="text-right">
              <div className="font-mono text-sm font-bold tabular-nums tracking-wide text-amber-300 sm:text-base">
                {currentTime || '--:--:--'}
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                {currentDate || 'PKT Lahore'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="tv-main-layout grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,44%)_minmax(0,56%)] md:overflow-hidden">
        <section className="relative min-h-[38vh] overflow-hidden border-b border-white/[0.08] bg-[radial-gradient(ellipse_at_center,_#182338_0%,_#070b12_70%)] md:min-h-0 md:border-b-0 md:border-r">
          <div id="youtube-player-container" className="absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/20" />
          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/75 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-100 shadow-lg backdrop-blur-md sm:left-6 sm:top-6 sm:text-xs">
            <Radio className="h-3.5 w-3.5 text-rose-400" />
            <span>Al Shaheen Media</span>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <span className="text-emerald-300">Live</span>
          </div>
        </section>

        <section className="flex min-h-[48vh] min-w-0 flex-col overflow-hidden bg-[#0b1321] md:min-h-0">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0d1727] px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/15 bg-amber-400/10">
                <Car className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-[0.12em] text-slate-100 sm:text-sm">
                  Live Bay & Delivery Status
                </h2>
                <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      queueStatus === 'live'
                        ? 'bg-emerald-400'
                        : queueStatus === 'error'
                          ? 'bg-rose-400'
                          : 'animate-pulse bg-amber-400'
                    }`}
                  />
                  {queueStatus === 'live'
                    ? 'Updates every 2 seconds'
                    : queueStatus === 'error'
                      ? 'Connection interrupted'
                      : 'Connecting to workshop'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-bold text-emerald-300 sm:text-xs">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {readyCount} Ready
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/15 bg-amber-400/[0.07] px-3 py-1.5 text-[10px] font-bold text-amber-200 sm:text-xs">
                <Activity className="h-3.5 w-3.5" />
                {inProgressCount} Active
              </span>
            </div>
          </div>

          <div
            ref={queueListRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto scroll-smooth p-4 sm:p-5 xl:p-6"
          >
            {queueStatus === 'error' && displayQueue.length > 0 && (
              <div
                role="status"
                className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-200"
              >
                Live updates are temporarily unavailable. Showing the latest received status.
              </div>
            )}

            {displayQueue.map((card) => {
              const isReady = card.status === 'READY_FOR_DELIVERY';
              const isAnnouncing = card.id === announcingCardId;
              const isWash = card.bay_category === 'CAR_WASH';
              const bayLabel = isWash
                ? `WASH BAY ${card.bay_number}`
                : `BAY ${card.bay_number}`;

              return (
                <article
                  key={card.id}
                  ref={(element) => {
                    if (element) cardRefs.current.set(card.id, element);
                    else cardRefs.current.delete(card.id);
                  }}
                  className={`grid min-h-[104px] grid-cols-1 items-center gap-4 rounded-2xl border p-4 transition-all duration-500 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6 sm:px-5 ${
                    isAnnouncing
                      ? 'border-amber-300 bg-gradient-to-r from-amber-400/25 via-emerald-400/[0.14] to-[#111d2a] shadow-[0_0_0_2px_rgba(251,191,36,0.24),0_0_32px_rgba(251,191,36,0.28)] ring-1 ring-amber-200/60'
                      : isReady
                      ? 'border-emerald-400/35 bg-gradient-to-r from-emerald-400/[0.11] via-[#111d2a] to-[#111d2a] shadow-[inset_3px_0_0_0_rgba(52,211,153,0.85)]'
                      : 'border-white/[0.08] bg-white/[0.035] hover:border-white/[0.14] hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border sm:h-14 sm:w-14 ${
                        isReady
                          ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
                          : 'border-white/10 bg-slate-950/60 text-amber-200'
                      }`}
                    >
                      <Car className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold tracking-tight text-white sm:text-base">
                        {card.make_model} {card.variant ? `(${card.variant})` : ''}
                      </h3>
                      {card.plate_number?.trim() && (
                        <div className="mt-1.5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-slate-950/50 px-2.5 py-1">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                            Plate
                          </span>
                          <span className="font-mono text-xs font-bold tracking-widest text-amber-100 sm:text-sm">
                            {card.plate_number.trim()}
                          </span>
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-400 sm:text-xs">
                        <span
                          className={`rounded-md border px-2 py-1 text-[9px] font-bold uppercase tracking-wide sm:text-[10px] ${
                            isWash
                              ? 'border-sky-400/20 bg-sky-400/[0.08] text-sky-200'
                              : 'border-amber-400/20 bg-amber-400/[0.08] text-amber-200'
                          }`}
                        >
                          {bayLabel}
                        </span>
                        <span className="truncate">
                          {card.departments?.slice(0, 2).join(' · ') || 'General service'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3 sm:flex-col sm:items-end sm:border-0 sm:pt-0">
                    {isReady ? (
                      <>
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-400 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-950 shadow-sm sm:text-xs">
                          <CheckCircle2 className="h-4 w-4" />
                          Ready for delivery
                        </span>
                        <span className="text-[10px] font-medium text-emerald-200/75">
                          {isAnnouncing ? 'Now being announced' : 'Please proceed to the counter'}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-amber-100 sm:text-xs">
                          <Clock className="h-3.5 w-3.5 text-amber-300" />
                          Work in progress
                        </span>
                        <span className="text-[10px] font-medium text-slate-500">
                          Our team is working on your vehicle
                        </span>
                      </>
                    )}
                  </div>
                </article>
              );
            })}

            {displayQueue.length === 0 && queueStatus === 'loading' && (
              <div className="space-y-3" aria-label="Loading vehicle status">
                {[0, 1].map((item) => (
                  <div
                    key={item}
                    className="flex min-h-[104px] items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5"
                  >
                    <div className="h-12 w-20 animate-pulse rounded-xl bg-white/[0.07]" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-2/5 animate-pulse rounded bg-white/[0.07]" />
                      <div className="h-3 w-1/4 animate-pulse rounded bg-white/[0.05]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {displayQueue.length === 0 && queueStatus === 'error' && (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-rose-400/15 bg-rose-400/[0.035] p-6 text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300">
                  <Radio className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-100">Unable to load live status</h3>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                  The workshop feed could not be reached. The screen will retry automatically.
                </p>
                <button
                  type="button"
                  onClick={fetchCards}
                  className="mt-4 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  Retry now
                </button>
              </div>
            )}

            {displayQueue.length === 0 && queueStatus === 'live' && (
              <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07]">
                  <Car className="h-6 w-6 text-emerald-300" />
                </div>
                <h3 className="text-base font-bold text-slate-100">All bays are clear</h3>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-400">
                  Vehicles will appear here as soon as they enter inspection, service, or detailing.
                </p>
              </div>
            )}
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-white/[0.08] bg-[#080e19] px-4 py-3 text-[10px] font-medium text-slate-400 sm:px-6 sm:text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />
              <span>Guest Wi-Fi · Executive Coffee Bar · Track on mobile at /track</span>
            </div>
            <div className="font-mono font-bold text-amber-200/80">
              Al Shaheen Auto Hub · Lahore
            </div>
          </footer>
        </section>
      </main>
    </div>
  );
}
