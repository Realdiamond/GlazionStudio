/**
 * Client-side API utilities (no secrets here)
 * All network calls go to /api/chat (Vercel serverless).
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

/**
 * Sends a chat message to the serverless API.
 */
export async function sendMessage(message: string): Promise<string> {
  const sanitized = sanitizeInput(message || '');
  if (!sanitized) throw new Error('Message cannot be empty');

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: sanitized,
    }),
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