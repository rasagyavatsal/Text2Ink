export function shouldNormalizeColor(value: string): boolean {
  return /(?:oklch|oklab|lab|lch|color-mix|color)\(/i.test(value);
}

export function normalizeCanvasColor(doc: Document, value: string): string | null {
  const canvas = doc.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const sentinel = 'rgb(1, 2, 3)';
  ctx.fillStyle = sentinel;
  try {
    ctx.fillStyle = value;
  } catch {
    return null;
  }

  const normalized = ctx.fillStyle;
  if (!normalized || normalized === sentinel) return null;
  if (shouldNormalizeColor(normalized)) return null;
  return normalized;
}

export async function waitForPages(
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
  minPages: number,
  timeoutMs: number
): Promise<void> {
  const start = Date.now();
  let lastCount = -1;
  let stableTicks = 0;

  while (Date.now() - start < timeoutMs) {
    const count = pageRefs.current.filter((ref) => ref !== null).length;
    if (count >= minPages) {
      if (count === lastCount) {
        stableTicks += 1;
      } else {
        stableTicks = 0;
      }
      lastCount = count;

      if (stableTicks >= 2) return;
    }

    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

export async function waitForPageRef(
  pageRefs: React.MutableRefObject<(HTMLDivElement | null)[]>,
  pageIndex: number,
  timeoutMs: number
): Promise<HTMLDivElement | null> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = pageRefs.current[pageIndex];
    if (el) return el;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
  return pageRefs.current[pageIndex] ?? null;
}

export async function waitForPageIndex(
  currentPageIndexRef: React.MutableRefObject<number>,
  targetIndex: number,
  timeoutMs: number
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (currentPageIndexRef.current === targetIndex) return;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }
}

export async function getInlinedFontCSS(): Promise<string> {
  const fontPromises: Promise<string>[] = [];

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        if (rule instanceof CSSFontFaceRule) {
          const src = rule.style.getPropertyValue('src');
          const urlMatch = src.match(/url\("?(.*?)"?\)/);
          
          if (urlMatch && urlMatch[1] && !urlMatch[1].startsWith('data:')) {
            const fontUrl = urlMatch[1];
            const fontRuleText = rule.cssText;
            
            fontPromises.push((async () => {
              try {
                const response = await fetch(fontUrl);
                const blob = await response.blob();
                const dataUrl = await new Promise<string>((resolve, reject) => {
                  const reader = new FileReader();
                  reader.onloadend = () => resolve(reader.result as string);
                  reader.onerror = reject;
                  reader.readAsDataURL(blob);
                });
                return fontRuleText.replace(fontUrl, dataUrl) + '\n';
              } catch (e) {
                console.warn('Failed to inline font:', fontUrl, e);
                return fontRuleText + '\n';
              }
            })());
          } else {
            fontPromises.push(Promise.resolve(rule.cssText + '\n'));
          }
        }
      }
    } catch (e) {
      // Cross-origin stylesheet
    }
  }

  const results = await Promise.all(fontPromises);
  return results.join('');
}
