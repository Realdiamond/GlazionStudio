/**
 * Client-side API utilities (no secrets here)
 * All network calls go to /api/chat (Vercel serverless), which holds the key.
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

export async function validateAndEncodeImage(file: File): Promise<string> {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
  if (!allowed.includes(file.type)) throw new Error('Invalid file type. Only PNG, JPG, JPEG, GIF, and WebP are allowed.');
  if (file.size > 5 * 1024 * 1024) throw new Error('File size too large. Maximum 5MB allowed.');

  const buf = await file.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return base64;
}

/**
 * Sends a chat message with optional image to the serverless API.
 * The server adds the system prompt and talks to OpenRouter.
 */
export async function sendMessage(message: string, imageFile?: File): Promise<string> {
  const sanitized = sanitizeInput(message || '');
  if (!sanitized && !imageFile) throw new Error('Message cannot be empty');

  // Optional image
  let imageBase64: string | undefined;
  if (imageFile) {
    imageBase64 = await validateAndEncodeImage(imageFile);
    // we send raw base64; the server prefixes context text
  }

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: sanitized,
      imageBase64,
      // model: 'openai/gpt-3.5-turbo', // optional override
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

/** Lightweight client-side limiter (kept from your original file) */
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
