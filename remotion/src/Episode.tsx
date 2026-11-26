import React, { useEffect, useMemo, useState } from 'react';
import { FREDOKA_BOLD } from './font';
import { AbsoluteFill, Audio, Img, Sequence, spring, useCurrentFrame, useVideoConfig, delayRender, continueRender } from 'remotion';
import { createTikTokStyleCaptions, Caption } from '@remotion/captions';

export type EpisodeProps = { base: string; timeline: any; v?: string };

// caption font: big white rounded bold (Fredoka 700), thick black outline
const fontCss = `@font-face { font-family: 'Fredoka'; font-weight: 700; src: url(${FREDOKA_BOLD}) format('woff2'); }`;
const useCaptionFont = () => {
  const [handle] = useState(() => delayRender('caption font'));
  useEffect(() => { let done = false; const go = () => { if (!done) { done = true; continueRender(handle); } };
    document.fonts.load("700 100px 'Fredoka'").then(go, go); const t = setTimeout(go, 8000); return () => clearTimeout(t); }, [handle]);
};

export const MASTER = 0.89;        // -1 dB safety trim on every audio layer so the encoded true peak stays below 0 dBFS
export const CAPTION = { top: '68%', fontSize: 136, stroke: 28, maxHoldMs: 250 };

const Word: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11, stiffness: 320, mass: 0.45 }, durationInFrames: 8 });
  const size = text.length > 9 ? CAPTION.fontSize * 9.5 / text.length : CAPTION.fontSize;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: CAPTION.top, left: 0, width: '100%', textAlign: 'center', transform: `translateY(-50%) scale(${0.55 + 0.45 * pop})`,
        fontFamily: 'Fredoka', fontWeight: 700, fontSize: size, lineHeight: 1, color: '#fff', letterSpacing: 1,
        WebkitTextStroke: `${CAPTION.stroke}px #000`, paintOrder: 'stroke fill', textShadow: '0 10px 0 rgba(0,0,0,0.45)' }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};

export const Episode: React.FC<EpisodeProps> = ({ base, timeline, v = '' }) => {
  const frame = useCurrentFrame(), { fps } = useVideoConfig();
  useCaptionFont();
  // word-by-word captions: one word per page
  const pages = useMemo(() => {
    const captions: Caption[] = timeline.captions.map((c: any) => ({ text: ' ' + c.text, startMs: c.startMs, endMs: c.endMs, timestampMs: (c.startMs + c.endMs) / 2, confidence: 1 }));
    return createTikTokStyleCaptions({ captions, combineTokensWithinMilliseconds: 0 }).pages;
  }, [timeline]);
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <style>{fontCss}</style>
      <Img src={`${base}/frames/f_${String(frame).padStart(5, '0')}.png`} style={{ width: 1080, height: 1920 }} />
      <Audio src={`${base}/audio/bed.wav?v=${v}`} volume={MASTER} />
      {timeline.voices.map((c: any) => (
        <Sequence key={c.line} from={Math.round(c.start * fps)} durationInFrames={Math.ceil(c.dur * fps) + 3} layout="none">
          <Audio src={`${base}/${c.file}?v=${v}`} volume={MASTER} />
        </Sequence>
      ))}
      {pages.map((p, i) => {
        const from = Math.round(p.startMs / 1000 * fps), next = pages[i + 1]?.startMs ?? Infinity;
        const spokenEnd = timeline.captions[i]?.endMs ?? p.startMs + p.durationMs;      // a word leaves shortly after it was spoken (no captions over silent beats)
        const endMs = Math.min(next, Math.max(spokenEnd, p.startMs + 160) + CAPTION.maxHoldMs);
        const dur = Math.max(2, Math.round(endMs / 1000 * fps) - from);
        return <Sequence key={i} from={from} durationInFrames={dur}><Word text={p.text.trim()} /></Sequence>;
      })}
    </AbsoluteFill>
  );
};
