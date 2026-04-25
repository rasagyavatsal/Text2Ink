export function normalizePastedPlainText(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\u00a0/g, ' ');
}

export function replaceSourceTextSlice(
  sourceText: string,
  startOffset: number,
  endOffset: number,
  replacement: string
): string {
  const start = Math.max(0, Math.min(startOffset, sourceText.length));
  const end = Math.max(start, Math.min(endOffset, sourceText.length));
  return `${sourceText.slice(0, start)}${replacement}${sourceText.slice(end)}`;
}

export function extractPlainTextFromContentEditable(root: HTMLElement): string {
  const chunks: string[] = [];

  const appendNewline = () => {
    if (chunks[chunks.length - 1] !== '\n') {
      chunks.push('\n');
    }
  };

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      chunks.push(normalizePastedPlainText(node.textContent ?? ''));
      return;
    }

    if (!(node instanceof HTMLElement)) return;

    const tagName = node.tagName.toLowerCase();
    if (tagName === 'br') {
      appendNewline();
      return;
    }

    const startsBlock = tagName === 'div' || tagName === 'p';
    if (startsBlock && chunks.length > 0) {
      appendNewline();
    }

    node.childNodes.forEach(visit);
  };

  root.childNodes.forEach(visit);

  return chunks.join('').replace(/\n{2,}$/u, '\n');
}
