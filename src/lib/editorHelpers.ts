import React from 'react';
import { HandwritingSettings } from './types';

export function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function calculateRandomStyle(
  charIndex: number,
  lineIndex: number,
  randomness: HandwritingSettings['randomness']
): React.CSSProperties {
  if (!randomness.enabled) {
    return { transform: 'none', marginLeft: '0px' };
  }

  const seed = charIndex * 1000 + lineIndex;
  const spacingOffset = (seededRandom(seed) - 0.5) * randomness.spacing * 2;
  const baselineOffset = (seededRandom(seed + 1) - 0.5) * randomness.baseline * 2;
  const rotationOffset = (seededRandom(seed + 2) - 0.5) * randomness.rotation * 2;

  return {
    transform: `translateY(${baselineOffset}px) rotate(${rotationOffset}deg)`,
    transformOrigin: 'left bottom',
    marginLeft: `${spacingOffset}px`,
  };
}

export type LineData = {
  text: string;
  lineIndex: number;
  hasNewline: boolean;
};

export function calculatePageStartOffsets(pages: LineData[][]): number[] {
  const offsets: number[] = [0];
  let total = 0;
  for (const page of pages) {
    for (const line of page) {
      total += line.text.length + (line.hasNewline ? 1 : 0);
    }
    offsets.push(total);
  }
  return offsets;
}

export function calculateLineStarts(
  lines: LineData[],
  pageStartOffset: number
): number[] {
  const starts: number[] = [];
  let offset = pageStartOffset;
  for (const line of lines) {
    starts.push(offset);
    offset += line.text.length + (line.hasNewline ? 1 : 0);
  }
  return starts;
}
