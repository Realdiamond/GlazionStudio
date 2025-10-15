/**
 * Client-side API utilities (no secrets here)
 * All network calls go to our Vercel serverless routes (e.g., /api/chat, /api/recipes-to-image).
 */

/* =========================
   Shared types & utilities
   ========================= 
*/

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') throw new Error('Input must be a string');
  return input
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .slice(0, 10000);
}

/** Lightweight client-side rate limiter */
class RateLimiter {
  private requests: number[] = [];
  constructor(private maxRequests = 20, private windowMs = 60000) {}

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    if (this.requests.length >= this.maxRequests) return false;
    this.requests.push(now);
    return true;
  }

  getTimeUntilReset(): number {
    if (this.requests.length === 0) return 0;
    const oldest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (Date.now() - oldest));
  }
}

export const rateLimiter = new RateLimiter(20, 60000);

/* =========================
   Chat: send a message
   ========================= */

/**
 * Sends a chat message to the serverless API.
 */
export async function sendMessage(message: string): Promise<string> {
  const sanitized = sanitizeInput(message || '');
  if (!sanitized) throw new Error('Message cannot be empty');

  // optional local throttle
  if (!rateLimiter.canMakeRequest()) {
    const wait = Math.ceil(rateLimiter.getTimeUntilReset() / 1000);
    throw new Error(`Please wait ${wait}s before trying again.`);
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: sanitized }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const e = await res.json();
      if (e?.error) msg = typeof e.error === 'string' ? e.error : JSON.stringify(e.error);
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  const out = (data?.content || '').trim();
  if (!out) throw new Error('No response from AI');
  return out;
}

/* =========================
   Recipes → Image: types
   ========================= */

// CLEAN REQUEST - exactly what backend expects
export type RecipesToImageRequest = {
  cone: string;
  atmosphere?: string;
  umf: Record<string, number>;
  molePct: Record<string, number>;
  notes?: string;
};

export type RecipesToImageResponse = {
  id: string;
  recipe: {
    cone: string;
    atmosphere?: string;
    umf: Record<string, number>;
    molePct: Record<string, number>;
    notes?: string;
  };
  imageUrl: string;
  isCloudStored: boolean;
  processingTimeMs: number;
  status: string;
  errorMessage: string | null;
  generatedAt: string;
  generatedPrompt?: string;
  matchedRecipe?: any;
};

/* =========================
   Recipes → Image: client
   ========================= */

/**
 * Calls our serverless proxy (/api/recipes-to-image), which forwards to the private backend.
 * Keeps secrets server-side and normalizes errors.
 */
export async function generateImageFromRecipeViaProxy(
  payload: RecipesToImageRequest
): Promise<RecipesToImageResponse> {
  // optional local throttle
  if (!rateLimiter.canMakeRequest()) {
    const wait = Math.ceil(rateLimiter.getTimeUntilReset() / 1000);
    throw new Error(`Please wait ${wait}s before trying again.`);
  }

  const r = await fetch('/api/recipes-to-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!r.ok) {
    // Proxy returns either { error: { message } } or a plain string (mirrors upstream)
    try {
      const maybeJson = await r.json();
      const msg =
        typeof maybeJson === 'string'
          ? maybeJson
          : maybeJson?.error?.message || maybeJson?.errorMessage || `HTTP ${r.status}`;
      throw new Error(msg);
    } catch {
      const txt = await r.text().catch(() => '');
      throw new Error(txt || `HTTP ${r.status}`);
    }
  }

  return r.json() as Promise<RecipesToImageResponse>;
}