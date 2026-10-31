/**
 * Splits text into overlapping word-based chunks.
 * Accepts either a string or a list of { page, text } entries.
 * Each chunk records the page holding most of its words (page)
 * and every page it touches (pages).
 */
function chunkText(input, { chunkSize = 220, overlap = 40 } = {}) {
  const pages = typeof input === 'string' ? [{ page: null, text: input }] : input;

  const words = [];
  const wordPages = [];
  for (const entry of pages) {
    const pageWords = entry.text.split(/\s+/).filter(Boolean);
    for (const word of pageWords) {
      words.push(word);
      wordPages.push(entry.page);
    }
  }

  const chunks = [];
  if (words.length === 0) return chunks;

  let start = 0;
  let position = 0;

  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = { text: words.slice(start, end).join(' '), position };

    // Count how many of this chunk's words sit on each page
    const counts = new Map();
    for (const p of wordPages.slice(start, end)) {
      if (p != null) counts.set(p, (counts.get(p) || 0) + 1);
    }
    if (counts.size > 0) {
      let best = null;
      let bestCount = 0;
      for (const [p, c] of counts) {
        if (c > bestCount) {
          best = p;
          bestCount = c;
        }
      }
      chunk.page = best;
      chunk.pages = [...counts.keys()].sort((a, b) => a - b);
    }

    chunks.push(chunk);
    position += 1;

    if (end === words.length) break;
    start = end - overlap;
  }

  return chunks;
}

module.exports = chunkText;