'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { JobCard } from '@/types';

type AnnouncementJobCard = Pick<
  JobCard,
  'id' | 'bay_category' | 'bay_number' | 'make_model'
>;

interface LoungeAudioEngineProps {
  queue: AnnouncementJobCard[];
  onAnnouncementComplete?: (cardId: string) => void;
  playerRef: React.MutableRefObject<any>;
}

export function playWebAudioChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        resolve();
        return;
      }
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // 3-tone harmonic elevator / airport chime: C5 (523.25), E5 (659.25), G5 (783.99)
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.18);

        gain.gain.setValueAtTime(0, now + idx * 0.18);
        gain.gain.linearRampToValueAtTime(0.3, now + idx * 0.18 + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.18 + 0.7);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.18);
        osc.stop(now + idx * 0.18 + 0.75);
      });

      setTimeout(() => {
        try {
          ctx.close();
        } catch (_) {}
        resolve();
      }, 900);
    } catch (err) {
      console.warn('Web Audio chime fallback error:', err);
      resolve();
    }
  });
}

export default function LoungeAudioEngine({
  queue,
  onAnnouncementComplete,
  playerRef,
}: LoungeAudioEngineProps) {
  const [isAnnouncing, setIsAnnouncing] = useState(false);
  const [currentAnnouncementText, setCurrentAnnouncementText] = useState<string | null>(null);
  const isProcessingRef = useRef(false);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || queue.length === 0) return;

    isProcessingRef.current = true;
    setIsAnnouncing(true);

    const nextCard = queue[0];
    const isWash = nextCard.bay_category === 'CAR_WASH';
    const bayTitle = isWash ? `Car Wash Bay ${nextCard.bay_number}` : `Workshop Bay ${nextCard.bay_number}`;
    const speechMessage = `Attention please. The ${nextCard.make_model || 'vehicle'} at ${bayTitle} is now ready for delivery.`;

    setCurrentAnnouncementText(
      `Announcing: ${nextCard.make_model || 'Vehicle'} - ${bayTitle}`
    );

    // 1. Duck YouTube volume to 10%
    try {
      if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
        playerRef.current.setVolume(10);
      }
    } catch (err) {
      console.warn('Could not duck YouTube volume:', err);
    }

    // 2. Play Audio Chime
    try {
      const audio = new Audio('/chime.mp3');
      await audio.play().catch(async () => {
        // Fallback to Web Audio API synthesized harmonic chime
        await playWebAudioChime();
      });
      // Pause slightly after chime
      await new Promise((r) => setTimeout(r, 600));
    } catch (_) {
      await playWebAudioChime();
    }

    // 3. Perform SpeechSynthesis
    await new Promise<void>((resolve) => {
      if (!window.speechSynthesis) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel(); // Clear any hung speech
      const utterance = new SpeechSynthesisUtterance(speechMessage);
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Select high quality English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('UK'))) ||
        voices.find((v) => v.lang.startsWith('en'));
      if (preferred) utterance.voice = preferred;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      window.speechSynthesis.speak(utterance);
    });

    // 4. Wait 1.2s post-speech interval
    await new Promise((r) => setTimeout(r, 1200));

    // Notify queue completion for this item
    if (onAnnouncementComplete) {
      onAnnouncementComplete(nextCard.id);
    }

    // If queue is now empty, restore volume
    if (queue.length <= 1) {
      try {
        if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
          playerRef.current.setVolume(100);
        }
      } catch (err) {
        console.warn('Could not restore YouTube volume:', err);
      }
      setIsAnnouncing(false);
      setCurrentAnnouncementText(null);
    }

    isProcessingRef.current = false;
  }, [queue, onAnnouncementComplete, playerRef]);

  useEffect(() => {
    if (queue.length > 0 && !isProcessingRef.current) {
      processQueue();
    }
  }, [queue, processQueue]);

  if (!isAnnouncing && !currentAnnouncementText) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 text-xs font-semibold animate-pulse shadow-lg">
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
      <span>{currentAnnouncementText || 'Broadcasting Delivery Announcement...'}</span>
    </div>
  );
}
