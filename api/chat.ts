/**
 * Users always see a friendly message on failure (never raw errors).
 * Real errors are logged as single-line structured JSON via console.error.
 * Branch/metrics logs use console.log (also single-line JSON).
 *
 * Single upstream:
 *    POST {PRIVATE_API_BASE_URL}/api/Query/ask
 *
 * Rules:
 * - Render upstream Markdown as-is (after link blocklist sanitization).
 * - Confidence floor for caching: >= CONV_CONFIDENCE_MIN (default 0.6).
 * - Adaptive TopK: if confidence < 0.7 and initial TopK ≤ 8, do ONE retry with +3 (cap 12).
 * - Cache: in-memory TTL 60s; DO NOT cache friendly error text or weak answers.
 * - Circuit breaker: 3 consecutive failures → skip upstream for 60s.
 * - Timeouts: 10s per upstream call.
 * - Back-compat: returns { answer, ... } and also { content: answer }.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/* ============================== Env & constants ============================== */

const RAW_BASE = String(process.env.PRIVATE_API_BASE_URL || '').replace(/\/+$/, ''); // REQUIRED, no trailing slash
const QUERY_TIMEOUT_MS = Number(process.env.QUERY_TIMEOUT_MS || 10_000);
const CONV_CONFIDENCE_MIN = Number(process.env.CONV_CONFIDENCE_MIN || 0.6);

const CACHE_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS || 60);
const MAX_CACHE_ENTRIES = Number(process.env.MAX_CACHE_ENTRIES || 1000);

const CIRCUIT_BREAKER_THRESHOLD = Number(process.env.CIRCUIT_BREAKER_THRESHOLD || 3);
const CIRCUIT_BREAKER_COOLDOWN_MS = Number(process.env.CIRCUIT_BREAKER_COOLDOWN_MS || 60_000);

const STRICT_LINK_BLOCKLIST = String(process.env.STRICT_LINK_BLOCKLIST || 'digitalfire.com')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

const GENERIC_ERROR_MESSAGE =
  String(process.env.GENERIC_ERROR_MESSAGE || '').trim()
  || 'Something went wrong. Please try again.';

/* ============================== Types (upstream) ============================== */
type QueryRequest = {
  query: string;
  topK?: number;
  includeMetadata?: boolean; // default true
  conversationId?: string;
};
type QuerySource = {
  content: string;
  confidence: number;
  sourceFolder: string;
  metadata?: any;
};
type QueryResponse = {
  answer: string;
  confidence: number; // 0..1
  conversationId?: string;
  sources?: QuerySource[];
  processingTimeMs?: number;
  queryType?: string;
};

/* ============================== Tiny in-memory LRU cache ============================== */
type CacheEntry = { value: QueryResponse; expiresAt: number };
const cache = new Map<string, CacheEntry>();

function getCache(key: string): QueryResponse | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) { cache.delete(key); return null; }
  // refresh LRU
  cache.delete(key);
  cache.set(key, hit);
  return hit.value;
}

function setCache(key: string, value: QueryResponse, ttlSec = CACHE_TTL_SECONDS) {
  if (!ttlSec) return;
  // simple LRU cap
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

/* ============================== Circuit breaker (single upstream) ============================== */
type Breaker = { fails: number; until?: number };
const cb: Breaker = { fails: 0, until: undefined };

function breakerOpen(): boolean {
  return !!(cb.until && Date.now() < cb.until);
}
function breakerFail() {
  cb.fails += 1;
  if (cb.fails >= CIRCUIT_BREAKER_THRESHOLD) {
    cb.until = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
    cb.fails = 0;
  }
}
function breakerOk() {
  cb.fails = 0; cb.until = undefined;
}

/* ============================== Helpers: ids + logging ============================== */
function reqId(): string {
  try {
    // @ts-ignore
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  } catch {}
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function logError(payload: Record<string, unknown>) {
  console.error(JSON.stringify({ level: 'error', route: '/api/chat', ...payload }));
}
function logInfo(payload: Record<string, unknown>) {
  console.log(JSON.stringify({ level: 'info', route: '/api/chat', ...payload }));
}

function normalizeMessage(s: string): string {
  return String(s || '').trim().replace(/\s+/g, ' ');
}

/* ============================== Link blocklist sanitiser ============================== */
function stripBlockedLinks(text: string): { out: string; blocked: number; domains: string[] } {
  if (!text) return { out: '', blocked: 0, domains: [] };
  let s = text, count = 0; const touched = new Set<string>();

  for (const dom of STRICT_LINK_BLOCKLIST) {
    const esc = dom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rawUrlRx = new RegExp(`https?:\\/\\/(?:www\\.)?${esc}[^\\s)\\]]*`, 'gi');
    const mdLinkRx = new RegExp(`\\[([^\\]]+)\\]\\((https?:\\/\\/(?:www\\.)?${esc}[^\\s)\\]]*)\\)`, 'gi');

    s = s.replace(rawUrlRx, () => { count++; touched.add(dom); return ''; });
    s = s.replace(mdLinkRx, (_m, txt: string) => { count++; touched.add(dom); return txt; });
  }

  // tidy blank list items / extra newlines
  s = s.replace(/^\s*[-•]\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  return { out: s, blocked: count, domains: Array.from(touched) };
}

/* ============================== Fetch helper with timeout ============================== */
async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

/* ============================== TopK heuristics ============================== */
function determineInitialTopK(message: string, requested?: number): number {
  if (typeof requested === 'number' && requested > 0) return Math.min(Math.max(1, requested), 12);

  const msg = message.toLowerCase();
  const words = msg.split(/\s+/).filter(Boolean);
  const isShort = words.length <= 5 && msg.length < 50;

  const complexityTerms = [' and ', ' or ', ' vs ', 'compare', 'list', 'step by step', 'why', 'how to', 'fix', 'troubleshoot'];
  const isComplex = complexityTerms.some(t => msg.includes(t)) || words.length > 15;

  const comprehensiveTerms = ['all', 'everything', 'complete', 'detailed', 'step by step'];
  const isComprehensive = comprehensiveTerms.some(t => msg.includes(t));

  if (isShort) return 3;
  if (isComprehensive) return 10;
  if (isComplex) return 8;
  return 5;
}

/* ============================== Upstream call ============================== */
async function callUpstream(body: QueryRequest, timeoutMs: number):
  Promise<{ ok: true; data: QueryResponse; ms: number } | { ok: false; error: string; status?: number; ms: number }> {
  const started = Date.now();
  try {
    const r = await fetchWithTimeout(`${RAW_BASE}/api/Query/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }, timeoutMs);

    const ms = Date.now() - started;
    if (!r.ok) {
      let text = '';
      try { text = await r.text(); } catch {}
      return { ok: false, status: r.status, error: text || `HTTP ${r.status}`, ms };
    }
    const json = await r.json() as QueryResponse;
    return { ok: true, data: json, ms };
  } catch (e: any) {
    const ms = Date.now() - started;
    const msg = e?.name === 'AbortError' ? 'timeout' : (e?.message || 'fetch_error');
    return { ok: false, error: msg, ms };
  }
}

/* ============================== Handler ============================== */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const request_id = reqId();
  const started_at = Date.now();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!RAW_BASE) {
      logError({ request_id, branch: 'config_error', base_url_set: false, msg: 'Missing PRIVATE_API_BASE_URL' });
      // Friendly message (don’t 5xx user)
      return res.status(200).json({ answer: GENERIC_ERROR_MESSAGE, content: GENERIC_ERROR_MESSAGE, confidence: 0 });
    }

    const { message, userId, topK, includeMetadata, conversationId } = (req.body || {}) as {
      message?: string;
      userId?: string;
      topK?: number;
      includeMetadata?: boolean;
      conversationId?: string;
    };

    if (!message || !String(message).trim()) {
      logError({ request_id, branch: 'bad_request', msg: 'No message provided' });
      return res.status(200).json({ answer: GENERIC_ERROR_MESSAGE, content: GENERIC_ERROR_MESSAGE, confidence: 0 });
    }

    // Circuit breaker short-circuit
    if (breakerOpen()) {
      logInfo({ request_id, branch: 'cb_open_friendly', cb_until: cb.until });
      return res.status(200).json({ answer: GENERIC_ERROR_MESSAGE, content: GENERIC_ERROR_MESSAGE, confidence: 0 });
    }

    // Cache key (by message + resolved topK + user)
    const normalized = normalizeMessage(message);
    const initialTopK = determineInitialTopK(normalized, typeof topK === 'number' ? topK : undefined);
    const cacheKey = `${normalized}::${initialTopK}::${userId || 'anon'}`;
    const cached = getCache(cacheKey);
    if (cached) {
      const san = stripBlockedLinks(cached.answer || '');
      logInfo({
        request_id,
        branch: 'cache_hit',
        topK_initial: initialTopK,
        confidence_final: cached.confidence,
        blockedLinks: { count: san.blocked, domains: san.domains },
      });
      return res.status(200).json({ ...cached, answer: san.out, content: san.out });
    }

    // First call
    const reqBody1: QueryRequest = {
      query: normalized,
      topK: initialTopK,
      includeMetadata: includeMetadata !== false, // default true
      conversationId,
    };
    const first = await callUpstream(reqBody1, QUERY_TIMEOUT_MS);
    if (!first.ok) {
      breakerFail();
      logError({
        request_id,
        branch: 'upstream_first_error',
        error: first.error,
        status: first.status ?? null,
        timings: { first_ms: first.ms },
      });
      return res.status(200).json({ answer: GENERIC_ERROR_MESSAGE, content: GENERIC_ERROR_MESSAGE, confidence: 0 });
    }

    let chosen = first.data;
    let topK_final = initialTopK;
    const conf_initial = chosen.confidence ?? 0;

    // Adaptive TopK (one bump) if low confidence and we didn't start high
    if (conf_initial < 0.7 && initialTopK <= 8) {
      const bumped = Math.min(12, initialTopK + 3);
      const reqBody2: QueryRequest = {
        query: normalized,
        topK: bumped,
        includeMetadata: includeMetadata !== false,
        conversationId: chosen.conversationId || conversationId,
      };
      const second = await callUpstream(reqBody2, QUERY_TIMEOUT_MS);

      if (second.ok && (second.data.confidence ?? 0) >= conf_initial) {
        chosen = second.data;
        topK_final = bumped;
      }

      logInfo({
        request_id,
        branch: 'adaptive_done',
        topK_initial: initialTopK,
        topK_final,
        confidence_initial: conf_initial,
        confidence_final: chosen.confidence ?? 0,
        timings: { first_ms: first.ms, second_ms: second.ok ? second.ms : null },
      });
    } else {
      logInfo({
        request_id,
        branch: 'single_shot',
        topK_initial: initialTopK,
        topK_final,
        confidence_initial: conf_initial,
        confidence_final: chosen.confidence ?? 0,
        timings: { first_ms: first.ms },
      });
    }

    // Upstream success → close CB
    breakerOk();

    // Blocklist sanitization
    const san = stripBlockedLinks(chosen.answer || '');
    const finalAnswer = san.out;

    // Cache only if above confidence floor (NEVER cache friendly error text)
    const okToCache = (chosen.confidence ?? 0) >= CONV_CONFIDENCE_MIN;
    if (okToCache) {
      setCache(cacheKey, { ...chosen, answer: finalAnswer });
    }

    const total_ms = Date.now() - started_at;
    logInfo({
      request_id,
      branch: okToCache ? 'success_cached' : 'success_uncached',
      latency_ms_total: total_ms,
      topK_final,
      confidence_final: chosen.confidence ?? 0,
      blockedLinks: { count: san.blocked, domains: san.domains },
      message_len: normalized.length,
      answer_len: finalAnswer.length,
      base_url_set: true,
    });

    // Return with back-compat { content }
    return res.status(200).json({
      answer: finalAnswer,
      content: finalAnswer, // backward compatibility
      confidence: chosen.confidence ?? 0,
      conversationId: chosen.conversationId,
      sources: (includeMetadata !== false) ? chosen.sources : undefined,
      processingTimeMs: chosen.processingTimeMs,
      queryType: chosen.queryType,
    } as QueryResponse & { content: string });
  } catch (e: any) {
    logError({ request_id, branch: 'unhandled_error', msg: e?.message || 'Unhandled error' });
    return res.status(200).json({ answer: GENERIC_ERROR_MESSAGE, content: GENERIC_ERROR_MESSAGE, confidence: 0 });
  }
}
