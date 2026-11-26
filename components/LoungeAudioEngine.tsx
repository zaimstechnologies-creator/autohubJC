'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { JobCard } from '@/types';

type AnnouncementJobCard = Pick<
  JobCard,
  'id' | 'bay_category' | 'bay_number' | 'make_model' | 'plate_number'
>;

interface LoungeAudioEngineProps {
  queue: AnnouncementJobCard[];
  onAnnouncementStart?: (cardId: string) => void;
  onAnnouncementComplete?: (cardId: string) => void;
  playerRef: React.MutableRefObject<any>;
}

const VOICE_PATH = '/voice';
const ANNOUNCEMENT_PLAYBACK_RATE = 0.96;
const PLATE_NUMBER_PLAYBACK_RATE = 0.96;
const YOUTUBE_ANNOUNCEMENT_VOLUME = 18;
const FIXED_CLIPS = ['attention-please', 'registration-number'] as const;
const ENDING_CLIPS = ['ready-for-delivery', 'proceed-accounts', 'thank-you'] as const;

function getAnnouncementClips(plateNumber?: string | null) {
  const plateClips = (plateNumber || '').toLowerCase().match(/[a-z0-9]/g) || [];

  return plateClips.length > 0
    ? [...FIXED_CLIPS, ...plateClips, ...ENDING_CLIPS]
    : ['attention-please', 'ready-for-delivery', ...ENDING_CLIPS.slice(1)];
}

export default function LoungeAudioEngine({
  queue,
  onAnnouncementStart,
  onAnnouncementComplete,
  playerRef,
}: LoungeAudioEngineProps) {
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [currentAnnouncementText, setCurrentAnnouncementText] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const voiceBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const isProcessingRef = useRef(false);
  const retryAfterRef = useRef(0);

  useEffect(() => {
    const AudioContextCtor =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const context = new AudioContextCtor();
    audioContextRef.current = context;

    const unlockAudio = async () => {
      if (context.state === 'suspended') {
        await context.resume();
      }
      retryAfterRef.current = 0;
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    const preload = async () => {
      const clips = [
        ...FIXED_CLIPS,
        ...ENDING_CLIPS,
        ...Array.from({ length: 26 }, (_, index) => String.fromCharCode(97 + index)),
        ...Array.from({ length: 10 }, (_, index) => String(index)),
      ];
      await Promise.all(clips.map(async (clip) => {
        if (voiceBuffersRef.current.has(clip)) return;
        const response = await fetch(`${VOICE_PATH}/${clip}.wav`);
        if (!response.ok) throw new Error(`Could not load voice clip: ${clip}`);
        const data = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(data);
        voiceBuffersRef.current.set(clip, buffer);
      }));
    };
    preload().catch((error) => console.warn(error));

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      context.close().catch(() => {});
      audioContextRef.current = null;
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (queue.length === 0) {
      return;
    }
    if (isProcessingRef.current || Date.now() < retryAfterRef.current) return;

    const context = audioContextRef.current;
    if (!context) return;

    isProcessingRef.current = true;
    const nextCard = queue[0];
    const plateNumber = nextCard.plate_number?.trim();

    try {
      setIsAnnouncing(true);
      setCurrentAnnouncementText(`Announcing: ${plateNumber || nextCard.make_model || 'Vehicle'}`);
      onAnnouncementStart?.(nextCard.id);

      try {
        playerRef.current?.setVolume?.(YOUTUBE_ANNOUNCEMENT_VOLUME);
      } catch (error) {
        console.warn('Could not lower lounge music volume:', error);
      }

      if (context.state === 'suspended') await context.resume();

      const clips = getAnnouncementClips(plateNumber);
      await Promise.all(clips.map(async (clip) => {
        if (voiceBuffersRef.current.has(clip)) return;
        const response = await fetch(`${VOICE_PATH}/${clip}.wav`);
        if (!response.ok) throw new Error(`Could not load voice clip: ${clip}`);
        const data = await response.arrayBuffer();
        const buffer = await context.decodeAudioData(data);
        voiceBuffersRef.current.set(clip, buffer);
      }));

      await new Promise<void>((resolve, reject) => {
        let scheduledAt = context.currentTime + 0.02;
        let lastSource: AudioBufferSourceNode | undefined;

        clips.forEach((clip) => {
          const buffer = voiceBuffersRef.current.get(clip);
          if (!buffer) {
            reject(new Error(`Missing voice clip: ${clip}`));
            return;
          }

          const source = context.createBufferSource();
          source.buffer = buffer;
          source.playbackRate.value = /^[a-z0-9]$/.test(clip)
            ? PLATE_NUMBER_PLAYBACK_RATE
            : ANNOUNCEMENT_PLAYBACK_RATE;
          source.connect(context.destination);
          source.start(scheduledAt);
          scheduledAt += buffer.duration / source.playbackRate.value;
          lastSource = source;
        });

        if (!lastSource) {
          reject(new Error('No voice clips were scheduled.'));
          return;
        }

        lastSource.onended = () => resolve();
      });

      onAnnouncementComplete?.(nextCard.id);
    } catch (error) {
      // Keep the vehicle in the queue and retry automatically without filling the
      // terminal with errors if a TV browser temporarily blocks media playback.
      retryAfterRef.current = Date.now() + 10_000;
    } finally {
      try {
        playerRef.current?.setVolume?.(100);
      } catch (error) {
        console.warn('Could not restore lounge music volume:', error);
      }
      setIsAnnouncing(false);
      setCurrentAnnouncementText(null);
      isProcessingRef.current = false;
    }
  }, [onAnnouncementComplete, onAnnouncementStart, playerRef, queue]);

  useEffect(() => {
    if (queue.length > 0 && !isProcessingRef.current) {
      processQueue();
    }
  }, [queue, processQueue]);

  if (!isAnnouncing && !currentAnnouncementText) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 text-xs font-semibold animate-pulse shadow-lg">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
      <span>{currentAnnouncementText || 'Broadcasting delivery announcement...'}</span>
    </div>
  );
}
