"use client";

import { useEffect, useRef, useState } from "react";

const MUSIC_URL = "/sounds/winner-moment.mp3";
const MAX_SECONDS = 15;

export default function WinnerMomentMusic({ mcAudioUrl }: { mcAudioUrl: string | null }) {
  const music = useRef<HTMLAudioElement>(null);
  const timer = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const mc = document.getElementById("winner-mc-audio") as HTMLAudioElement | null;
    const track = music.current;
    if (!mc || !track) return;
    const duck = () => { track.volume = 0.12; };
    const restore = () => { track.volume = 0.42; };
    mc.addEventListener("play", duck);
    mc.addEventListener("pause", restore);
    mc.addEventListener("ended", restore);
    return () => {
      mc.removeEventListener("play", duck);
      mc.removeEventListener("pause", restore);
      mc.removeEventListener("ended", restore);
    };
  }, [mcAudioUrl]);

  useEffect(() => () => {
    if (timer.current !== null) window.clearInterval(timer.current);
  }, []);

  function stop() {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    const track = music.current;
    if (track) {
      track.pause();
      track.currentTime = 0;
      track.volume = 0.42;
    }
    setPlaying(false);
  }

  async function toggle() {
    const track = music.current;
    if (!track) return;
    if (playing) { stop(); return; }

    track.currentTime = 0;
    const mc = document.getElementById("winner-mc-audio") as HTMLAudioElement | null;
    track.volume = mc && !mc.paused ? 0.12 : 0.42;

    try {
      await track.play();
      setPlaying(true);
      const started = performance.now();
      timer.current = window.setInterval(() => {
        const elapsed = (performance.now() - started) / 1000;
        if (elapsed >= MAX_SECONDS) { stop(); return; }
        const currentMc = document.getElementById("winner-mc-audio") as HTMLAudioElement | null;
        const target = currentMc && !currentMc.paused ? 0.12 : 0.42;
        track.volume = target * Math.min(1, (MAX_SECONDS - elapsed) / 3);
      }, 100);
    } catch {
      setUnavailable(true);
      setPlaying(false);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#ffc857]/40 bg-[#ffc857]/[.08] p-4 sm:p-5">
      <audio ref={music} src={MUSIC_URL} preload="none"
        onEnded={stop} onError={() => setUnavailable(true)} />
      <p className="text-sm font-black text-[#ffc857]">A little music for your big moment</p>
      <p className="mt-1 text-xs text-white/70">
        Tap to play a short celebration, then hear the MC below.
      </p>
      <button type="button" onClick={toggle} disabled={unavailable}
        className="mt-3 min-h-12 rounded-xl border border-[#ffc857] px-5 py-2 font-bold text-white transition hover:bg-[#ffc857]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13ed77] disabled:opacity-50">
        {unavailable ? "Music unavailable" : playing ? "Turn music off" : "Play my celebration"}
      </button>
    </div>
  );
}
