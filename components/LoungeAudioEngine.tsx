'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { JobCard } from '@/types';

type AnnouncementJobCard = Pick<
  JobCard,
  'id' | 'bay_category' | 'bay_number' | 'make_model' | 'plate_number'
>;

interface LoungeAudioEngineProps {
  queue: AnnouncementJobCard[];
  onAnnouncementComplete?: (cardId: string) => void;
  playerRef: React.MutableRefObject<any>;
}

const VOICE_PATH = '/voice';
const FIXED_CLIPS = ['attention-please', 'registration-number'] as const;
const ENDING_CLIPS = ['ready-for-delivery', 'proceed-accounts', 'thank-you'] as const;

function getAnnouncementClips(plateNumber?: string | null) {
  const plateClips = (plateNumber || '').toLowerCase().match(/[a-z0-9]/g) || [];

  return plateClips.length > 0
    ? [...FIXED_CLIPS, ...plateClips, ...ENDING_CLIPS]
    : ['attention-please', 'ready-for-delivery', ...ENDING_CLIPS.slice(1)];
}

function playClip(audio: HTMLAudioElement, clip: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = () => {
      audio.onended = null;
      audio.onerror = null;
      resolve();
    };
    const fail = () => {
      audio.onended = null;
      audio.onerror = null;
      reject(new Error(`Could not play voice clip: ${clip}`));
    };

    audio.pause();
    audio.currentTime = 0;
    audio.src = `${VOICE_PATH}/${clip}.wav`;
    audio.onended = finish;
    audio.onerror = fail;
    audio.play().catch(fail);
  });
}

export default function LoungeAudioEngine({
  queue,
  onAnnouncementComplete,
  playerRef,
}: LoungeAudioEngineProps) {
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [currentAnnouncementText, setCurrentAnnouncementText] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isProcessingRef = useRef(false);
  const retryAfterRef = useRef(0);

  // A single HTMLAudioElement is retained for every clip. A real user gesture once
  // unlocks later automatic playback on kiosk and Android TV browsers.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const unlockAudio = () => {
      audio.src = `${VOICE_PATH}/attention-please.wav`;
      audio.volume = 0;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = 1;
          retryAfterRef.current = 0;
        })
        .catch(() => {
          audio.volume = 1;
        });
    };

    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const processQueue = useCallback(async () => {
    if (queue.length === 0) {
      return;
    }
    if (isProcessingRef.current || Date.now() < retryAfterRef.current) return;

    const audio = audioRef.current;
    if (!audio) return;

    isProcessingRef.current = true;
    const nextCard = queue[0];
    const plateNumber = nextCard.plate_number?.trim();

    try {
      setIsAnnouncing(true);
      setCurrentAnnouncementText(`Announcing: ${plateNumber || nextCard.make_model || 'Vehicle'}`);

      try {
        playerRef.current?.setVolume?.(35);
      } catch (error) {
        console.warn('Could not lower lounge music volume:', error);
      }

      for (const clip of getAnnouncementClips(plateNumber)) {
        await playClip(audio, clip);
      }

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
  }, [onAnnouncementComplete, playerRef, queue]);

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
