export type LineDetectionOptions = {
  targetWidth: number;
  targetHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  expectedLineHeight: number;
};

export type LineDetectionResult = {
  lineOffset: number;
  lineSpacing: number;
  linePositions: number[];
};

const DEFAULT_MAX_SCAN_STEP_X = 2;
const MAX_CLUSTER_GAP = 3;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });

export async function detectBackgroundLines(
  src: string,
  options: LineDetectionOptions
): Promise<LineDetectionResult | null> {
  if (typeof document === 'undefined') return null;

  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = options.targetWidth;
  canvas.height = options.targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  const drawWidth = img.width * scale;
  const drawHeight = img.height * scale;
  const offsetX = (canvas.width - drawWidth) / 2;
  const offsetY = (canvas.height - drawHeight) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

  const width = canvas.width;
  const height = canvas.height;
  const xStart = clamp(Math.floor(options.marginLeft), 0, width - 1);
  const xEnd = clamp(Math.floor(width - options.marginRight), xStart + 1, width);
  const yStart = clamp(Math.floor(options.marginTop), 0, height - 1);
  const yEnd = clamp(Math.floor(height - options.marginBottom), yStart + 1, height);

  const imageData = ctx.getImageData(xStart, yStart, xEnd - xStart, yEnd - yStart);
  const data = imageData.data;
  const rowCount = yEnd - yStart;
  const colCount = xEnd - xStart;
  const rowDarkness: number[] = new Array(rowCount).fill(0);

  for (let y = 0; y < rowCount; y++) {
    let sum = 0;
    let samples = 0;
    const rowOffset = y * colCount * 4;
    for (let x = 0; x < colCount; x += DEFAULT_MAX_SCAN_STEP_X) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sum += luminance;
      samples += 1;
    }
    const avg = sum / Math.max(1, samples);
    rowDarkness[y] = 1 - avg / 255;
  }

  const mean = rowDarkness.reduce((acc, v) => acc + v, 0) / rowDarkness.length;
  const variance =
    rowDarkness.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / rowDarkness.length;
  const std = Math.sqrt(variance);
  const threshold = mean + std * 0.6;

  const peaks: Array<{ y: number; value: number }> = [];
  for (let y = 1; y < rowDarkness.length - 1; y++) {
    const value = rowDarkness[y];
    if (value < threshold) continue;
    if (value >= rowDarkness[y - 1] && value >= rowDarkness[y + 1]) {
      peaks.push({ y, value });
    }
  }

  if (peaks.length === 0) return null;

  const clustered: Array<{ y: number; value: number }> = [];
  for (const peak of peaks) {
    const last = clustered[clustered.length - 1];
    if (!last || peak.y - last.y > MAX_CLUSTER_GAP) {
      clustered.push({ ...peak });
    } else if (peak.value > last.value) {
      clustered[clustered.length - 1] = { ...peak };
    }
  }

  const linePositions = clustered.map((c) => c.y + yStart);
  if (linePositions.length < 2) return null;

  const diffs = [] as number[];
  for (let i = 1; i < linePositions.length; i++) {
    diffs.push(linePositions[i] - linePositions[i - 1]);
  }

  const expected = Math.max(10, options.expectedLineHeight);
  const minSpacing = expected * 0.6;
  const maxSpacing = expected * 1.6;
  const filteredDiffs = diffs.filter((d) => d >= minSpacing && d <= maxSpacing);
  if (filteredDiffs.length === 0) return null;

  const lineSpacing = median(filteredDiffs);
  const lineOffset = linePositions[0] - options.marginTop;

  return {
    lineOffset,
    lineSpacing,
    linePositions,
  };
}
