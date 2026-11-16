'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { JobCard, WORKSHOP_BAYS, CAR_WASH_BAYS } from '@/types';
import LoungeAudioEngine, { playWebAudioChime, formatPlateForSpeech } from '@/components/LoungeAudioEngine';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import {
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Radio,
  CheckCircle2,
  Clock,
  Tv,
  Car,
  Sparkles,
  Volume1,
} from 'lucide-react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady?: () => void;
    YT?: any;
  }
}

export default function LoungeTVPage() {
  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [announcementQueue, setAnnouncementQueue] = useState<JobCard[]>([]);
  const [announcedCardIds, setAnnouncedCardIds] = useState<Set<string>>(new Set());
  const [playlistId, setPlaylistId] = useState(
    process.env.NEXT_PUBLIC_YOUTUBE_PLAYLIST_ID || 'PLfWI-z1AjtsA'
  );
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const playerRef = useRef<any>(null);
  const initialLoadDone = useRef(false);

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

  // Fetch job cards
  const fetchCards = async () => {
    try {
      const res = await fetch('/api/jobcards', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        const cards: JobCard[] = json.data || [];
        setJobCards(cards);

        // Detect newly ready vehicles for announcement queue
        const readyVehicles = cards.filter((c) => c.status === 'READY_FOR_DELIVERY');

        if (initialLoadDone.current) {
          readyVehicles.forEach((c) => {
            if (!announcedCardIds.has(c.id)) {
              setAnnouncementQueue((prev) => {
                if (prev.some((item) => item.id === c.id)) return prev;
                return [...prev, c];
              });
            }
          });
        } else {
          // On first load, mark existing ready vehicles as already notified
          const existingIds = new Set(readyVehicles.map((c) => c.id));
          setAnnouncedCardIds(existingIds);
          initialLoadDone.current = true;
        }
      }
    } catch (err) {
      console.error('TV queue fetch error:', err);
    }
  };

  useEffect(() => {
    fetchCards();

    // Supabase Realtime subscription
    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel('tv_realtime_jobcards')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'job_cards' },
          () => {
            fetchCards();
          }
        )
        .subscribe();

      return () => {
        if (supabase) {
          supabase.removeChannel(channel);
        }
      };
    }

    const timer = setInterval(fetchCards, 6000);
    return () => clearInterval(timer);
  }, [announcedCardIds]);

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
                  event.target.playVideo();
                  if (isAudioUnlocked) {
                    event.target.unMute();
                    event.target.setVolume(100);
                  }
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

  // Unlock Audio & Fullscreen
  const handleUnlockAudioAndFullscreen = async () => {
    setIsAudioUnlocked(true);

    // 1. Play sound context to unlock audio policy
    try {
      await playWebAudioChime();
    } catch (_) {}

    // 2. Unmute YouTube player & enforce playlist looping
    try {
      if (playerRef.current) {
        if (typeof playerRef.current.setLoop === 'function') playerRef.current.setLoop(true);
        if (typeof playerRef.current.unMute === 'function') playerRef.current.unMute();
        if (typeof playerRef.current.setVolume === 'function') playerRef.current.setVolume(100);
        if (typeof playerRef.current.playVideo === 'function') playerRef.current.playVideo();
      }
    } catch (err) {
      console.warn('Unmute error:', err);
    }

    // 3. Request Fullscreen
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.warn('Fullscreen toggle:', err);
    }
  };

  // Test Voice Announcement
  const handleTestVoice = () => {
    const testCard: JobCard = {
      id: `test_${Date.now()}`,
      job_card_number: 'ASH-DEMO',
      customer_name: 'Test Customer',
      customer_phone: '0300-1234567',
      plate_number: 'AQP 007',
      make_model: 'Mazda Flair 007',
      mileage_km: 45000,
      bay_category: 'WORKSHOP',
      bay_number: 1,
      status: 'READY_FOR_DELIVERY',
      fuel_level_percent: 75,
      handed_over_inventory: { spare_wheel: true, tools: true, mats: true, valuables_cleared: true },
      inspection_markers: [],
      departments: ['Diagnostics'],
      itemized_parts: [],
      labor_charges: 0,
      alignment_charges: 0,
      discount_amount: 0,
      advance_deposit: 0,
      parts_total: 0,
      net_payable: 0,
      balance_remaining: 0,
      quality_checks: {
        exterior_clean: true,
        interior_clean: true,
        engine_area_clean: true,
        all_systems_checked: true,
        test_drive_done: true,
        no_warning_lights: true,
        work_completed: true,
        customer_satisfied: true,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      closed_at: null,
      service_advisor: 'Master Incharge',
    };

    setAnnouncementQueue((prev) => [...prev, testCard]);
  };

  const handleAnnouncementFinished = (cardId: string) => {
    setAnnouncementQueue((prev) => prev.filter((c) => c.id !== cardId));
    setAnnouncedCardIds((prev) => new Set(prev).add(cardId));
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

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#0B1221] text-white flex flex-col font-sans select-none">
      {/* 60" Lounge Header Bar */}
      <header className="h-16 px-6 bg-[#070d18] border-b border-slate-800 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-4">
          <div className="bg-white p-1 rounded-xl shadow-lg border border-slate-700/50 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="Al Shaheen Auto Hub"
              className="h-11 w-auto object-contain"
            />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-black tracking-tight uppercase text-white">
                Al Shaheen Auto Hub
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-[#ba1825]/20 text-rose-300 border border-[#ba1825]/40">
                Customer Lounge Display
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Main Bedian Road, DHA Phase 6, Lahore • Live Workshop Operations
            </p>
          </div>
        </div>

        {/* Center: Live FIFO Announcement Notification */}
        <div className="hidden lg:flex items-center">
          <LoungeAudioEngine
            queue={announcementQueue}
            onAnnouncementComplete={handleAnnouncementFinished}
            playerRef={playerRef}
          />
        </div>

        {/* Right Controls & Clock */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleTestVoice}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition shadow"
            title="Test Voice Announcement"
          >
            <Volume1 className="w-4 h-4 text-amber-400" />
            Test Voice
          </button>

          <button
            type="button"
            onClick={handleUnlockAudioAndFullscreen}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-lg ${
              isAudioUnlocked
                ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40'
                : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500 animate-pulse'
            }`}
          >
            {isAudioUnlocked ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-400" />
                Audio Active
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4" />
                Unmute & Fullscreen
              </>
            )}
          </button>

          <div className="text-right pl-3 border-l border-slate-800">
            <div className="text-lg font-black font-mono text-amber-400 tracking-wider">
              {currentTime || '--:--:--'}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              {currentDate || 'PKT Lahore'}
            </div>
          </div>
        </div>
      </header>

      {/* Main 50/50 Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Left 50%: Official YouTube Channel Playlist Loop */}
        <div className="w-full md:w-1/2 h-full bg-black relative flex items-center justify-center border-r border-slate-800 overflow-hidden">
          <div id="youtube-player-container" className="w-full h-full object-cover" />

          {/* Overlay Watermark Badge */}
          <div className="absolute top-4 left-4 pointer-events-none bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs font-bold text-amber-400 flex items-center gap-2 shadow-lg">
            <Radio className="w-3.5 h-3.5 text-red-500 animate-ping" />
            <span>Al Shaheen Media Broadcast</span>
          </div>
        </div>

        {/* Right 50%: Live 12-Bay Queue */}
        <div className="w-full md:w-1/2 h-full bg-[#0B1221] flex flex-col overflow-hidden">
          {/* Queue Sub-Header */}
          <div className="px-5 py-3 bg-[#0d1627] border-b border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Car className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
                Live Bay Matrix & Delivery Status
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                {displayQueue.filter((c) => c.status === 'READY_FOR_DELIVERY').length} Ready
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400 font-medium">
                {displayQueue.filter((c) => c.status === 'IN_PROGRESS').length} In Progress
              </span>
            </div>
          </div>

          {/* Queue Card Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displayQueue.map((card) => {
              const isReady = card.status === 'READY_FOR_DELIVERY';
              const isWash = card.bay_category === 'CAR_WASH';
              const bayLabel = isWash
                ? `WASH BAY ${card.bay_number}`
                : `BAY ${card.bay_number}`;

              return (
                <div
                  key={card.id}
                  className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4 shadow-xl ${
                    isReady
                      ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40 shadow-emerald-950/80 scale-[1.01]'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  {/* Left: Plate & Vehicle Info */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`px-3.5 py-2 rounded-xl font-mono font-black text-lg tracking-wider border shadow-md ${
                        isReady
                          ? 'bg-emerald-500 text-slate-950 border-emerald-300 animate-pulse'
                          : 'bg-slate-950 text-amber-400 border-amber-500/40'
                      }`}
                    >
                      {card.plate_number}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold text-white tracking-tight">
                        {card.make_model} {card.variant ? `(${card.variant})` : ''}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <span
                          className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                            isWash
                              ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                              : 'bg-amber-950 text-amber-300 border border-amber-800/60'
                          }`}
                        >
                          {bayLabel}
                        </span>
                        <span>•</span>
                        <span>{card.departments?.slice(0, 2).join(', ') || 'Service'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Status Badge & Gate Pass Indicator */}
                  <div className="text-right">
                    {isReady ? (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 tracking-wide uppercase animate-pulse">
                          <CheckCircle2 className="w-4 h-4" />
                          READY FOR DELIVERY
                        </span>
                        <div className="text-[11px] text-emerald-300 font-mono">
                          Gate Pass Issued
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 uppercase">
                          <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
                          IN PROGRESS
                        </span>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Work Underway
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {displayQueue.length === 0 && (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <Car className="w-12 h-12 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-400">All Bays Clear</h3>
                <p className="text-xs text-slate-600">
                  Vehicles undergoing inspection, wash, or repair will appear live on this screen.
                </p>
              </div>
            )}
          </div>

          {/* Footer Marquee Banner */}
          <div className="py-2.5 px-5 bg-[#070d18] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Free High-Speed Wi-Fi • Executive Coffee Bar • Track on Mobile at /track</span>
            </div>
            <div className="font-mono text-amber-400/90 font-bold">
              Al Shaheen Auto Hub Lahore
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
