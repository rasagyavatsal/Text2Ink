export type LineData = {
  text: string;
  lineIndex: number;
  hasNewline: boolean;
};

export function pageTextFromLines(lines: LineData[]): string {
  return lines.map((line) => line.text + (line.hasNewline ? '\n' : '')).join('');
}

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
