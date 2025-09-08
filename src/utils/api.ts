// /utils/api.ts
/**
 * Client-side API utilities (no secrets here)
 * All network calls go to /api/chat.
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') throw new Error('Input must be a string');
  return input.trim().replace(/[\u0000-\u001F\u007F-\u009F]/g, '').slice(0, 10000);
}

/** Upstream response shape (proxied by /api/chat). */
export interface QuerySource {
  content: string;
  confidence: number;
  sourceFolder: string;
  metadata?: any;
}
export interface QueryResponse {
  answer: string;                 // same as `content`
  content?: string;               // back-compat
  confidence: number;             // 0..1 (0 = friendly error path)
  conversationId?: string;
  sources?: QuerySource[];
  processingTimeMs?: number;
  queryType?: string;
}

/** Options you can pass when sending a message. */
export interface SendOptions {
  topK?: number;
  includeMetadata?: boolean;      // default true on server
  conversationId?: string;        // send back what you received previously
  userId?: string;                // for server cache/logs (not sent upstream)
}

/**
 * Sends a chat message to your serverless API.
 * Simplified to match your working old version.
 */
export async function sendMessage(message: string, options: SendOptions = {}): Promise<QueryResponse> {
  const sanitized = sanitizeInput(message || '');
  if (!sanitized) throw new Error('Message cannot be empty');

  // Keep it simple like your old working version
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: sanitized,
      userId: options.userId || 'anonymous'
    }),
  });

  // Your backend always returns 200, even for errors! Parse JSON first
  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Invalid JSON response (HTTP ${res.status})`);
  }

  // Get the response data
  const answer = (data?.answer || data?.content || '').trim();
  const confidence = typeof data?.confidence === 'number' ? data.confidence : 0;
  
  // Only treat as error if it's the actual generic error message (not just confidence 0)
  if (answer === 'Something went wrong on our side. Please try again in a moment.' || answer.includes('Something went wrong')) {
    throw new Error(answer);
  }
  
  if (!answer) throw new Error('No response from AI');

  const response: QueryResponse = {
    answer,
    content: answer, // back-compat
    confidence: typeof data?.confidence === 'number' ? data.confidence : 0,
    conversationId: data?.conversationId,
    sources: Array.isArray(data?.sources) ? data.sources : undefined,
    processingTimeMs: typeof data?.processingTimeMs === 'number' ? data.processingTimeMs : undefined,
    queryType: typeof data?.queryType === 'string' ? data.queryType : undefined,
  };

  return response;
}

/** Convenience wrapper if some callers still expect plain text. */
export async function sendMessageText(message: string, options?: SendOptions): Promise<string> {
  const r = await sendMessage(message, options);
  return r.answer;
}

/** Lightweight client-side limiter (kept from your original file). */
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