// A flat, searchable copy of the page's text. Anchors are built and resolved against the same index,
// so what is saved always lines up with what is found later.

/** Tag name of our own on-page UI. Its text is never part of the index. */
export const UI_HOST_TAG = 'forest-ui';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', UI_HOST_TAG.toUpperCase()]);

export interface TextIndex {
  text: string;
  nodes: { node: Text; start: number }[];
}

export function buildTextIndex(): TextIndex {
  const nodes: TextIndex['nodes'] = [];
  let text = '';
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      for (let el = node.parentElement; el; el = el.parentElement) {
        if (SKIP_TAGS.has(el.tagName)) return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    nodes.push({ node, start: text.length });
    text += node.data;
  }
  return { text, nodes };
}

/** Converts a selection range into start and end positions in the index text. */
export function rangeToOffsets(index: TextIndex, range: Range): { start: number; end: number } | null {
  let start = -1;
  let end = -1;
  for (const { node, start: nodeStart } of index.nodes) {
    if (!range.intersectsNode(node)) {
      if (start >= 0) break;
      continue;
    }
    const from = node === range.startContainer ? range.startOffset : 0;
    const to = node === range.endContainer ? range.endOffset : node.length;
    if (start < 0) start = nodeStart + from;
    end = nodeStart + to;
  }
  return start >= 0 && end > start ? { start, end } : null;
}

function locate(index: TextIndex, offset: number, preferEarlier: boolean): { node: Text; offset: number } | null {
  for (const { node, start } of index.nodes) {
    const last = offset === start + node.length;
    if (offset < start + node.length || (preferEarlier && last)) return { node, offset: offset - start };
  }
  return null;
}

/** Converts positions in the index text back into a live DOM range. */
export function offsetsToRange(index: TextIndex, start: number, end: number): Range | null {
  const from = locate(index, start, false);
  const to = locate(index, end, true);
  if (!from || !to) return null;
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}
