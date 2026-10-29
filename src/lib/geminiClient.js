const ENDPOINT = '/api/gemini';
const RETRYABLE = new Set([429, 502, 503, 504]); // only transient errors are retried
const MAX_ATTEMPTS = 2;

export class ApiError extends Error {
  constructor(message, status) { super(message); this.name = 'ApiError'; this.status = status; }
}

const sleep = (ms, signal) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new DOMException('Aborted', 'AbortError'));
    }, { once: true });
  });

export async function callGemini({ mode, userQuery, signal }) {
  let delay = 1000;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, userQuery }),
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && typeof data.text === 'string' && data.text) return data.text;
      throw new ApiError(typeof data.error === 'string' ? data.error : 'Request failed.', res.status);
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      const retryable = !(err instanceof ApiError) || RETRYABLE.has(err.status);
      if (!retryable || attempt === MAX_ATTEMPTS) throw err;
      await sleep(delay + Math.random() * 250, signal);
      delay *= 2;
    }
  }
}

// Fixed messages only; never show raw network or upstream text to users.
export function userMessage(err) {
  if (err instanceof ApiError) {
    if (err.status === 400 || err.status === 413) return err.message;
    if (err.status === 429) return 'Rate limit reached. Wait a moment and retry.';
    if (err.status >= 500) return 'The AI service is temporarily unavailable.';
    return 'The request could not be completed.';
  }
  return 'Network error. Check your connection and retry.';
}