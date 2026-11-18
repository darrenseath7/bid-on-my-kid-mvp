"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const MUSIC_URL = "/sounds/winner-moment.mp3";

export default function WinnerMomentReveal({ children, winnerName, artworkImage, artistFirstName }: {
  children: ReactNode;
  winnerName: string;
  artworkImage: string;
  artistFirstName: string;
}) {
  const music = useRef<HTMLAudioElement>(null);
  const [phase, setPhase] = useState<"ready" | "spotlight" | "revealed">("ready");
  const revealed = phase === "revealed";
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicAvailable, setMusicAvailable] = useState(true);

  useEffect(() => {
    if (phase !== "spotlight") return;
    const timer = window.setTimeout(() => setPhase("revealed"), 2700);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!revealed) return;
    const voices = Array.from(document.querySelectorAll<HTMLAudioElement>(
      '#winner-mc-audio, [data-winner-voice]'
    ));
    const track = music.current;
    if (!track) return;

    const adjust = () => {
      const remaining = Number.isFinite(track.duration) ? track.duration - track.currentTime : Infinity;
      track.volume = (voices.some(voice => !voice.paused) ? 0.12 : 0.42) *
        Math.min(1, Math.max(0, remaining / 3));
    };
    voices.forEach(voice => {
      voice.addEventListener("play", adjust);
      voice.addEventListener("pause", adjust);
      voice.addEventListener("ended", adjust);
    });
    return () => {
      voices.forEach(voice => {
        voice.removeEventListener("play", adjust);
        voice.removeEventListener("pause", adjust);
        voice.removeEventListener("ended", adjust);
      });
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
    setPhase(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "revealed" : "spotlight");
  }

  function toggleMusic() {
    const track = music.current;
    if (!track) return;
    if (!track.paused) {
      track.pause();
      setMusicPlaying(false);
      return;
    }
    if (Number.isFinite(track.duration) && track.currentTime >= track.duration - 0.1) track.currentTime = 0;
    void track.play()
      .then(() => setMusicPlaying(true))
      .catch(() => setMusicAvailable(false));
  }

  function updateMusic() {
    const track = music.current;
    if (!track) return;
    const voices = document.querySelectorAll<HTMLAudioElement>('#winner-mc-audio, [data-winner-voice]');
    const normal = Array.from(voices).some(voice => !voice.paused) ? 0.12 : 0.42;
    const remaining = Number.isFinite(track.duration) ? track.duration - track.currentTime : Infinity;
    track.volume = normal *
      Math.min(1, Math.max(0, remaining / 3));
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
      ) : phase === "spotlight" ? (
        <section className="relative z-10 mx-auto flex min-h-[min(90dvh,760px)] w-full max-w-3xl flex-col items-center justify-center overflow-hidden rounded-[30px] border border-[#ffc857]/70 bg-[#071225] px-5 py-8 text-center shadow-[0_28px_90px_rgba(0,0,0,.7)] sm:px-10"
          aria-label="Revealing your winning artwork">
          <p className="text-xs font-black uppercase tracking-[.25em] text-[#ffc857]">BragWall · Young art. Big pride.</p>
          <h1 className="mt-5 text-3xl font-black leading-tight sm:text-5xl">
            {winnerName ? `${winnerName}, you won something special…` : "You won something special…"}
          </h1>
          <div className="winner-spotlight-stage relative mt-7 flex h-[min(48dvh,420px)] w-full items-center justify-center overflow-hidden rounded-3xl border border-[#ffc857]/30 bg-[#101c30] p-3 sm:p-6">
            <div aria-hidden="true" className="winner-spotlight-glow pointer-events-none absolute inset-0" />
            <img src={artworkImage} alt="" referrerPolicy="no-referrer"
              className="winner-spotlight-image relative h-full w-full object-contain drop-shadow-[0_15px_25px_rgba(0,0,0,.5)]" />
          </div>
          <p className="mt-6 text-lg font-bold text-white/90">
            {artistFirstName ? `Created by ${artistFirstName}. Made yours tonight.` : "Created by a young artist. Made yours tonight."}
          </p>
          <button type="button" onClick={() => setPhase("revealed")}
            className="mt-5 min-h-11 rounded-xl border border-white/35 px-5 py-2 text-sm font-bold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#13ed77]">
            Show my artwork now
          </button>
        </section>
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
          <img src={artworkImage} alt="" referrerPolicy="no-referrer" aria-hidden="true"
            className="pointer-events-none absolute h-px w-px opacity-0" />
        </section>
      )}
      <style>{`
        .winner-spotlight-stage { box-shadow: inset 0 0 90px rgba(255,200,87,.08); }
        .winner-spotlight-glow { background: radial-gradient(circle at 50% 45%, rgba(255,200,87,.38), transparent 62%); animation: winner-glow 2.7s ease-out both; }
        .winner-spotlight-image { animation: winner-spotlight 2.55s ease-in-out both; }
        @keyframes winner-spotlight {
          0% { clip-path: circle(0% at 50% 47%); opacity: .25; transform: scale(1.08); }
          70% { clip-path: circle(55% at 50% 47%); opacity: 1; transform: scale(1.025); }
          100% { clip-path: circle(95% at 50% 47%); opacity: 1; transform: scale(1); }
        }
        @keyframes winner-glow { from { opacity: 0; } 65% { opacity: 1; } to { opacity: .6; } }
        @media (prefers-reduced-motion: reduce) {
          .winner-spotlight-image, .winner-spotlight-glow { animation: none; }
        }
      `}</style>
    </>
  );
}
export function YoungArtistVoice({ artworkId, artistFirstName }: {
  artworkId: string;
  artistFirstName: string;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(false);

  async function toggle() {
    const recording = audio.current;
    if (!recording) return;
    if (!recording.paused) {
      recording.pause();
      return;
    }
    if (recording.ended) recording.currentTime = 0;
    try {
      await recording.play();
      setError(false);
    } catch {
      setError(true);
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-[#13ed77]/50 bg-[#13ed77]/[.09] p-4 shadow-[0_0_28px_rgba(19,237,119,.08)] sm:p-5">
      <p className="text-xs font-black uppercase tracking-[.14em] text-[#13ed77]">A message from the young artist</p>
      <p className="mt-2 text-lg font-bold text-white">
        {artistFirstName ? `Hear ${artistFirstName} talk about the artwork` : "Hear the young artist talk about the artwork"}
      </p>
      <button type="button" onClick={toggle}
        className="mt-4 min-h-14 w-full rounded-2xl bg-[#13ed77] px-5 py-3 text-base font-black text-[#07152b] shadow-[0_10px_25px_rgba(19,237,119,.18)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#ffc857]">
        {playing ? "❚❚ Pause the voice note" : "▶ Hear the young artist"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-[#ffc857]">Could not play the recording. Try the player below.</p>}
      <audio ref={audio} controls preload="none" data-winner-voice src={`/api/artwork-voice/${artworkId}`}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)}
        className="mt-3 w-full" aria-label="Play the young artist’s voice note" />
    </div>
  );
}
