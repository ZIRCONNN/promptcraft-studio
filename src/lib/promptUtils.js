// Pure helpers for crash-safe storage and validated model output (S2, S5).

const VAR_RE = /\{\{([a-zA-Z0-9_]+)\}\}/g;
export const ALLOWED_MODELS = ['ChatGPT', 'Claude', 'Gemini', 'Midjourney'];

const LIMITS = { role: 300, goal: 2000, context: 3000, constraints: 3000, tone: 100, explanation: 2000 };

/** matchAll clones the regex, so there is no shared lastIndex state. */
export function detectVariables(...texts) {
  const found = new Set();
  for (const m of texts.join('\n').matchAll(VAR_RE)) found.add(m[1]);
  return [...found];
}

/** Validates types and lengths of the model's JSON, and reports placeholders it dropped. */
export function parseEnhancement(rawJson, original) {
  const data = JSON.parse(rawJson); // throws on malformed JSON; caller's catch handles it
  const out = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    if (typeof data?.[key] !== 'string') {
      throw new Error(`Enhancement response is missing "${key}".`);
    }
    out[key] = data[key].slice(0, max);
  }
  const before = detectVariables(original.role, original.goal, original.context, original.constraints, original.tone);
  const after = new Set(detectVariables(out.role, out.goal, out.context, out.constraints, out.tone));
  out.droppedVariables = before.filter((v) => !after.has(v));
  return out;
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Coerces one stored record into a known-good shape, or returns null if unusable. */
export function sanitizePrompt(p) {
  if (!p || typeof p !== 'object') return null;
  const score = Number(p.qualityScore);
  return {
    id: str(p.id, 64) || `saved-${crypto.randomUUID()}`,
    title: str(p.title, 200) || 'Untitled Prompt',
    category: str(p.category, 40) || 'Productivity',
    targetModel: ALLOWED_MODELS.includes(p.targetModel) ? p.targetModel : 'ChatGPT',
    role: str(p.role, LIMITS.role),
    goal: str(p.goal, LIMITS.goal),
    context: str(p.context, LIMITS.context),
    constraints: str(p.constraints, LIMITS.constraints),
    tone: str(p.tone, LIMITS.tone),
    tags: Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === 'string').slice(0, 10) : [],
    isFavorite: p.isFavorite === true,
    qualityScore: Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0,
    createdAt: Number.isNaN(Date.parse(p.createdAt)) ? new Date().toISOString() : p.createdAt,
  };
}

/** Never throws: blocked storage, bad JSON, or a non-array all fall back. */
export function loadSavedPrompts(fallback) {
  try {
    const raw = JSON.parse(localStorage.getItem('promptcraft_saved') ?? 'null');
    return Array.isArray(raw) ? raw.map(sanitizePrompt).filter(Boolean) : fallback;
  } catch {
    return fallback;
  }
}

/** Never throws: reading storage can fail in private mode or with blocked site data. */
export function readTheme() {
  try {
    return localStorage.getItem('promptcraft_theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function renderVariables(text, values) {
  return text.replace(VAR_RE, (whole, name) =>
    Object.hasOwn(values, name) && values[name] ? values[name] : whole
  );
}

export function assemblePrompt(s, values) {
  let out;
  if (s.targetModel === 'Midjourney') {
    // /imagine must be one line, so collapse newlines. Variables are now filled for this branch too.
    out = `/imagine prompt: ${s.goal} --role ${s.role} --style ${s.tone} ${s.constraints} --ar 16:9 --v 6.0`
      .replace(/\s+/g, ' ');
  } else {
    const prefix = s.targetModel === 'Claude'
      ? '<system_instructions>\nYou are an expert assistant. Follow instructions with meticulous care.\n</system_instructions>\n\n'
      : '';
    out = (
      prefix +
      (s.role ? `[ROLE / PERSONA]\nAct as ${s.role}.\n\n` : '') +
      (s.goal ? `[GOAL / OBJECTIVE]\n${s.goal}\n\n` : '') +
      (s.context ? `[CONTEXT & BACKGROUND]\n${s.context}\n\n` : '') +
      (s.constraints ? `[CONSTRAINTS & FORMATTING]\n${s.constraints}\n\n` : '') +
      (s.tone ? `[TONE & STYLE]\nAdopt a ${s.tone} tone.` : '')
    ).trim();
  }
  return renderVariables(out, values);
}

export function buildEnhanceQuery(s) {
  return `Optimize these prompt components for ${s.targetModel}. Make the goal actionable, ` +
    `context rich, and constraints highly structured.\n<user_prompt_fields>\n` +
    `Role: ${s.role}\nGoal: ${s.goal}\nContext: ${s.context}\nConstraints: ${s.constraints}\nTone: ${s.tone}\n` +
    `</user_prompt_fields>`;
}