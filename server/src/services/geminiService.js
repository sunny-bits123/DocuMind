const EMBEDDING_MODEL = 'gemini-embedding-001';
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || 'gemini-3.1-flash-lite';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * fetch with automatic retries for temporary Gemini failures
 * (busy server, rate limit, network hiccup). Waits about 1s, 2s, then 4s.
 */
async function fetchWithRetry(url, options, label) {
  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const res = await fetch(url, options);

      // Success, a permanent error, or out of retries: hand the response back
      if (res.ok || !RETRYABLE_STATUS.has(res.status) || attempt === MAX_RETRIES) {
        return res;
      }

      lastError = new Error(`${label} returned ${res.status}`);
      await res.arrayBuffer().catch(() => {}) // free the connection before retrying
    }    catch (err) {
      if (err.name === 'AbortError') throw err; // user closed the page: don't retry
      lastError = err;
      if (attempt === MAX_RETRIES) throw err;
    }

    const delay = 1000 * 2 ** attempt + Math.random() * 300;
    console.warn(
      `${label} failed (${lastError.message}). Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
    );
    await sleep(delay);
  }

  throw lastError;
}

function getApiKey() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error('GEMINI_API_KEY is not set in .env');
  }
  return key;
}

async function embedText(text) {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/models/${EMBEDDING_MODEL}:embedContent`;

  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        model: `models/${EMBEDDING_MODEL}`,
        content: { parts: [{ text }] }
      })
    },
    'Gemini embedding'
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini embedding request failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.embedding.values;
}

async function embedChunks(chunks, { delayMs = 150 } = {}) {
  const embeddings = [];
  for (const chunk of chunks) {
    const vector = await embedText(chunk.text);
    embeddings.push(vector);
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
  }
  return embeddings;
}

async function generateAnswer(prompt) {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/models/${CHAT_MODEL}:generateContent`;

  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      })
    },
    'Gemini generation'
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini generation request failed (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Gemini returned no answer text');
  }

  return text;
}
/**
 * Streams the answer from Gemini. Calls onToken(text) for every piece as it
 * arrives and returns the full answer when finished.
 */
async function streamAnswer(prompt, onToken, signal) {
  const apiKey = getApiKey();
  const url = `${BASE_URL}/models/${CHAT_MODEL}:streamGenerateContent?alt=sse`;

  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024
        }
      }),
      signal
    },
    'Gemini streaming'
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini streaming request failed (${res.status}): ${errBody}`);
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  const handleLine = (line) => {
    if (!line.startsWith('data:')) return;
    const json = line.slice(5).trim();
    if (!json || json === '[DONE]') return;

    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      return;
    }

    const text = (parsed.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    if (text) {
      full += text;
      onToken(text);
    }
  };

  for await (const chunk of res.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop();
    lines.forEach(handleLine);
  }
  if (buffer) handleLine(buffer);

  if (!full) {
    throw new Error('Gemini returned no answer text');
  }
  return full;
}
/**
 * Generates a document overview: a short summary, the main topics covered,
 * and a handful of suggested starter questions — used to give users
 * immediate context after upload instead of a blank chat box.
 * Callers should treat failures here as non-fatal.
 */
async function generateDocumentOverview(sampleText, documentName) {
  const prompt = `You are analyzing a document called "${documentName}". Below is its content (or a representative sample of it, if long).

Respond in EXACTLY this format, with no extra commentary before or after:

SUMMARY: <3 to 5 sentences describing what this document is about>
TOPICS:
- <a main topic covered in this document>
- <a main topic covered in this document>
- <a main topic covered in this document>
QUESTIONS:
- <a specific question this document can answer>
- <a specific question this document can answer>
- <a specific question this document can answer>

Include 3 to 8 topics and 3 to 5 questions. Topics should be short (2-4 words each). Questions must be things someone could realistically ask about THIS document's actual content, not generic questions.

Document content:
${sampleText}`;

  const raw = await generateAnswer(prompt);

  const summaryMatch = raw.match(/SUMMARY:\s*([\s\S]+?)(?:\nTOPICS:|\nQUESTIONS:|$)/);
  const summary = summaryMatch ? summaryMatch[1].trim().replace(/\s+/g, ' ') : null;

  const topicsBlockMatch = raw.match(/TOPICS:\s*([\s\S]+?)(?:\nQUESTIONS:|$)/);
  const topics = topicsBlockMatch
    ? [...topicsBlockMatch[1].matchAll(/^-\s*(.+)$/gm)]
        .map((m) => m[1].trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const questionsBlockMatch = raw.match(/QUESTIONS:\s*([\s\S]+)$/);
  const questions = questionsBlockMatch
    ? [...questionsBlockMatch[1].matchAll(/^-\s*(.+)$/gm)]
        .map((m) => m[1].trim())
        .filter(Boolean)
        .slice(0, 5)
    : [];

  if (!summary && topics.length === 0 && questions.length === 0) {
    throw new Error('Could not parse a summary, topics, or questions from Gemini response');
  }

  return { summary, topics, suggestedQuestions: questions };
}

module.exports = {
  embedText,
  embedChunks,
  generateAnswer,
  streamAnswer,
  generateDocumentOverview
};