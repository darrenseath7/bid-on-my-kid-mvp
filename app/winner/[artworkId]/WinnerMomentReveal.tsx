"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const MUSIC_URL = "/sounds/winner-moment.mp3";

export default function WinnerMomentReveal({ children, winnerName }: {
  children: ReactNode;
  winnerName: string;
}) {
  const music = useRef<HTMLAudioElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicAvailable, setMusicAvailable] = useState(true);

  useEffect(() => {
    if (!revealed) return;
    const mc = document.getElementById("winner-mc-audio") as HTMLAudioElement | null;
    const track = music.current;
    if (!mc || !track) return;

    const adjust = () => {
      track.volume = (mc.paused ? 0.42 : 0.12) *
        Math.min(1, Math.max(0, (15 - track.currentTime) / 3));
    };
    mc.addEventListener("play", adjust);
    mc.addEventListener("pause", adjust);
    mc.addEventListener("ended", adjust);
    return () => {
      mc.removeEventListener("play", adjust);
      mc.removeEventListener("pause", adjust);
      mc.removeEventListener("ended", adjust);
    };
  }, [revealed]);

  function start() {
    const track = music.current;
    // Start playback directly inside the tap event for mobile browser permission.
    if (track) {
      track.currentTime = 0;
      track.volume = 0.42;
      void track.play()
        .then(() => setMusicPlaying(true))
        .catch(() => setMusicAvailable(false));
    }
    setRevealed(true);
  }

  function toggleMusic() {
    const track = music.current;
    if (!track) return;
    if (!track.paused) {
      track.pause();
      setMusicPlaying(false);
      return;
    }
    if (track.currentTime >= 15) track.currentTime = 0;
    void track.play()
      .then(() => setMusicPlaying(true))
      .catch(() => setMusicAvailable(false));
  }

  function updateMusic() {
    const track = music.current;
    if (!track) return;
    if (track.currentTime >= 15) {
      track.pause();
      setMusicPlaying(false);
      return;
    }
    const mc = document.getElementById("winner-mc-audio") as HTMLAudioElement | null;
    const normal = mc && !mc.paused ? 0.12 : 0.42;
    track.volume = normal *
      Math.min(1, Math.max(0, (15 - track.currentTime) / 3));
  }

  return (
    <>
      <audio ref={music} src={MUSIC_URL} preload="auto"
        onTimeUpdate={updateMusic}
        onEnded={() => setMusicPlaying(false)}
        onError={() => setMusicAvailable(false)} />

      {revealed ? (
        <>
          {children}
          {musicAvailable && (
            <button type="button" onClick={toggleMusic}
              className="fixed bottom-5 right-5 z-50 min-h-12 rounded-full border border-[#ffc857] bg-[#07152b] px-5 py-2 text-sm font-bold text-white shadow-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13ed77]">
              {musicPlaying ? "♪ Music on · turn off" : "♪ Play music again"}
            </button>
          )}
        </>
      ) : (
        <section className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center rounded-[28px] border border-[#ffc857]/70 bg-[#08142a]/95 px-6 py-12 text-center shadow-[0_28px_90px_rgba(0,0,0,.6)] sm:px-10">
          <p className="text-2xl font-black">BragWall</p>
          <p className="mt-1 text-[10px] font-black tracking-[.2em] text-[#ffc857]">
            YOUNG ART. BIG PRIDE.
          </p>
          <span aria-hidden="true" className="mt-10 text-5xl">✦</span>
          <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl">
            {winnerName ? `${winnerName}, ` : ""}your moment is here.
          </h1>
          <p className="mt-5 max-w-sm text-base leading-relaxed text-white/75">
            A young artist made something wonderful. Your winning bid made this a moment to remember.
          </p>
          <button type="button" onClick={start}
            className="mt-9 min-h-16 w-full rounded-2xl bg-[#13ed77] px-6 py-4 text-lg font-black text-[#07152b] shadow-[0_14px_32px_rgba(19,237,119,.18)] transition hover:bg-[#65f4a1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffc857]">
            ✨ Reveal my SOLD moment
          </button>
          <p className="mt-4 text-xs text-white/60">
            Tap to reveal the artwork with a little music. Sound is optional.
          </p>
        </section>
      )}
    </>
  );
}