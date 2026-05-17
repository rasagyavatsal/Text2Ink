export type PlainTextSelectionOffsets = {
  anchor: number;
  focus: number;
};

function newlineBeforeElement(el: HTMLElement, currentOffset: number) {
  const tagName = el.tagName.toLowerCase();
  return currentOffset > 0 && (tagName === 'div' || tagName === 'p') ? 1 : 0;
}

function textLengthForNode(node: Node, currentOffset: number): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent ?? '').replace(/\u00a0/g, ' ').length;
  }
  if (!(node instanceof HTMLElement)) return 0;
  if (node.tagName.toLowerCase() === 'br') return 1;

  let length = newlineBeforeElement(node, currentOffset);
  node.childNodes.forEach((child) => {
    length += textLengthForNode(child, currentOffset + length);
  });
  return length;
}

function offsetForNode(root: HTMLElement, target: Node, targetOffset: number): number {
  if (target === root) {
    let offset = 0;
    const children = Array.from(root.childNodes).slice(0, targetOffset);
    for (const child of children) {
      offset += textLengthForNode(child, offset);
    }
    return offset;
  }

  let offset = 0;
  let found = false;

  const visit = (node: Node) => {
    if (found) return;

    if (node === target) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += Math.min(targetOffset, (node.textContent ?? '').length);
      } else {
        if (node instanceof HTMLElement) {
          offset += newlineBeforeElement(node, offset);
        }
        const children = Array.from(node.childNodes).slice(0, targetOffset);
        for (const child of children) {
          offset += textLengthForNode(child, offset);
        }
      }
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += (node.textContent ?? '').replace(/\u00a0/g, ' ').length;
      return;
    }

    if (!(node instanceof HTMLElement)) return;
    if (node.tagName.toLowerCase() === 'br') {
      offset += 1;
      return;
    }

    offset += newlineBeforeElement(node, offset);
    node.childNodes.forEach(visit);
  };

  root.childNodes.forEach(visit);
  return offset;
}

function findNodeAtOffset(root: HTMLElement, targetOffset: number) {
  let offset = 0;
  let found: { node: Node; offset: number } | null = null;

  const visit = (node: Node) => {
    if (found) return;

    if (node.nodeType === Node.TEXT_NODE) {
      const textLength = (node.textContent ?? '').length;
      if (targetOffset <= offset + textLength) {
        found = { node, offset: Math.max(0, targetOffset - offset) };
        return;
      }
      offset += textLength;
      return;
    }

    if (!(node instanceof HTMLElement)) return;
    if (node.tagName.toLowerCase() === 'br') {
      if (targetOffset <= offset + 1) {
        found = { node: node.parentNode ?? root, offset: 0 };
        return;
      }
      offset += 1;
      return;
    }

    const blockNewline = newlineBeforeElement(node, offset);
    if (blockNewline) offset += blockNewline;
    node.childNodes.forEach(visit);
  };

  root.childNodes.forEach(visit);
  return found ?? { node: root, offset: root.childNodes.length };
}

export function getSelectionOffsets(root: HTMLElement): PlainTextSelectionOffsets | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  if (!root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) return null;

  return {
    anchor: offsetForNode(root, selection.anchorNode!, selection.anchorOffset),
    focus: offsetForNode(root, selection.focusNode!, selection.focusOffset),
  };
}

export function restoreSelectionFromOffsets(root: HTMLElement, anchor: number, focus: number): void {
  const selection = window.getSelection();
  if (!selection) return;

  const anchorPoint = findNodeAtOffset(root, anchor);
  const focusPoint = findNodeAtOffset(root, focus);
  const range = document.createRange();
  range.setStart(anchorPoint.node, anchorPoint.offset);
  range.setEnd(focusPoint.node, focusPoint.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function pageToGlobalOffsets(
  pageStartOffset: number,
  selection: PlainTextSelectionOffsets
): PlainTextSelectionOffsets {
  return {
    anchor: pageStartOffset + selection.anchor,
    focus: pageStartOffset + selection.focus,
  };
}
